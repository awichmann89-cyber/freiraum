import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookingSeries, bookingSeriesRooms, rooms } from "@/lib/db/schema";
import { seriesBookingSchema, groupSeriesBookingSchema } from "@/lib/validation/booking";
import { buildRRuleString } from "@/lib/series/expand";
import { addYearsToDateString, minDateString } from "@/lib/datetime";
import { describeRecurrence } from "@/lib/recurrence-label";
import { auth } from "@/lib/auth";
import { checkBookingRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { notifyAdminOfNewBooking, sendBookingRequestConfirmation } from "@/lib/email/booking";

const MAX_SERIES_SPAN_YEARS = 2;

interface NormalizedSeriesInput {
  roomIds: string[];
  startTime: string;
  endTime: string;
  seriesStartDate: string;
  message?: string;
  recurrence: {
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    interval: number;
    byWeekday?: ("MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU")[];
    endType: "on_date" | "after_count";
    endDate?: string;
    count?: number;
  };
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
  let normalized: NormalizedSeriesInput;

  if (isGroup) {
    const parsed = groupSeriesBookingSchema.safeParse(body);
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
    const parsed = seriesBookingSchema.safeParse(body);
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

  const rruleText = buildRRuleString(normalized.recurrence);
  const cappedEndDate = addYearsToDateString(normalized.seriesStartDate, MAX_SERIES_SPAN_YEARS);
  const seriesEndDate =
    normalized.recurrence.endType === "on_date" && normalized.recurrence.endDate
      ? minDateString(normalized.recurrence.endDate, cappedEndDate)
      : cappedEndDate;

  const [series] = await db
    .insert(bookingSeries)
    .values({
      type: isGroup ? "group" : "external_rental",
      rrule: rruleText,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      seriesStartDate: normalized.seriesStartDate,
      seriesEndDate,
      requesterName: normalized.requesterName,
      requesterEmail: normalized.requesterEmail,
      requesterPhone: normalized.requesterPhone,
      createdByUserId: isGroup ? session!.user.id : null,
      message: normalized.message || null,
      status: "requested",
    })
    .returning();

  await db
    .insert(bookingSeriesRooms)
    .values(normalized.roomIds.map((roomId) => ({ seriesId: series.id, roomId })));

  const roomNames = candidateRooms
    .filter((r) => normalized.roomIds.includes(r.id))
    .map((r) => r.name);
  const dateRangeLabel = describeRecurrence(
    normalized.recurrence,
    normalized.seriesStartDate,
    normalized.startTime,
    normalized.endTime
  );

  await notifyAdminOfNewBooking({
    requesterName: normalized.requesterName,
    requesterEmail: normalized.requesterEmail,
    requesterPhone: normalized.requesterPhone,
    roomNames,
    message: normalized.message || null,
    isSeries: true,
    reviewPath: `/admin/serien/${series.id}`,
    dateRangeLabel,
  });

  await sendBookingRequestConfirmation({
    requesterEmail: normalized.requesterEmail,
    requesterName: normalized.requesterName,
    roomNames,
    dateRangeLabel,
    isSeries: true,
  });

  return NextResponse.json({ id: series.id }, { status: 201 });
}
