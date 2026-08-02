import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, bookingRooms, rooms } from "@/lib/db/schema";
import { singleBookingSchema, groupSingleBookingSchema } from "@/lib/validation/booking";
import { combineDateAndTime } from "@/lib/datetime";
import { formatDateTimeRange } from "@/lib/format";
import { auth } from "@/lib/auth";
import { checkBookingRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { notifyAdminOfNewBooking, sendBookingRequestConfirmation } from "@/lib/email/booking";

interface NormalizedBookingInput {
  roomIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  message?: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (session?.user && session.user.role === "admin") {
    return NextResponse.json(
      { error: "Admins können hier keine eigenen Buchungen anlegen." },
      { status: 403 }
    );
  }

  const isGroup = session?.user?.role === "group";

  if (!isGroup) {
    const ip = getClientIp(request) ?? "unknown";
    const { success } = await checkBookingRateLimit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." },
        { status: 429 }
      );
    }
  }

  const body = await request.json();
  let normalized: NormalizedBookingInput;

  if (isGroup) {
    const parsed = groupSingleBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    normalized = {
      ...parsed.data,
      requesterName: session!.user.name!,
      requesterEmail: session!.user.email!,
      requesterPhone: null,
    };
  } else {
    const parsed = singleBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    normalized = {
      ...parsed.data,
      requesterPhone: parsed.data.requesterPhone || null,
    };
  }

  const candidateRooms = await db.select().from(rooms).where(inArray(rooms.id, normalized.roomIds));
  const validRoomIds = new Set(candidateRooms.filter((r) => r.isActive).map((r) => r.id));
  if (normalized.roomIds.some((id) => !validRoomIds.has(id))) {
    return NextResponse.json({ error: "Ungültige Raumauswahl." }, { status: 400 });
  }

  const startAt = combineDateAndTime(normalized.date, normalized.startTime);
  const endAt = combineDateAndTime(normalized.date, normalized.endTime);

  const [booking] = await db
    .insert(bookings)
    .values({
      type: isGroup ? "group" : "external_rental",
      status: "requested",
      requesterName: normalized.requesterName,
      requesterEmail: normalized.requesterEmail,
      requesterPhone: normalized.requesterPhone,
      message: normalized.message || null,
      startAt,
      endAt,
      createdByUserId: isGroup ? session!.user.id : null,
    })
    .returning();

  await db
    .insert(bookingRooms)
    .values(normalized.roomIds.map((roomId) => ({ bookingId: booking.id, roomId })));

  const roomNames = candidateRooms
    .filter((r) => normalized.roomIds.includes(r.id))
    .map((r) => r.name);
  const dateRangeLabel = formatDateTimeRange(startAt, endAt);

  await notifyAdminOfNewBooking({
    requesterName: normalized.requesterName,
    requesterEmail: normalized.requesterEmail,
    requesterPhone: normalized.requesterPhone,
    roomNames,
    message: normalized.message || null,
    isSeries: false,
    reviewPath: `/admin/anfragen/${booking.id}`,
    dateRangeLabel,
  });

  await sendBookingRequestConfirmation({
    requesterEmail: normalized.requesterEmail,
    requesterName: normalized.requesterName,
    roomNames,
    dateRangeLabel,
    isSeries: false,
  });

  return NextResponse.json({ id: booking.id }, { status: 201 });
}
