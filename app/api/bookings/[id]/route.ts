import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, bookingRooms, rooms } from "@/lib/db/schema";
import { requireAdmin, isResponse } from "@/lib/api-auth";
import { auth } from "@/lib/auth";
import { toPublicBooking } from "@/lib/anonymize";
import { formatDateTimeRange } from "@/lib/format";
import { sendBookingStatusUpdate } from "@/lib/email/booking";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-ip";
import { BOOKING_STATUS_LABELS } from "@/lib/labels";

const patchSchema = z.object({
  status: z.enum(["in_review", "approved", "rejected", "cancelled"]).optional(),
  adminNotes: z.string().max(4000).optional(),
});

const NOTIFY_STATUSES = new Set(["approved", "rejected", "cancelled"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!row) {
    return NextResponse.json({ error: "Anfrage nicht gefunden." }, { status: 404 });
  }

  const roomLinks = await db
    .select({ roomId: bookingRooms.roomId })
    .from(bookingRooms)
    .where(eq(bookingRooms.bookingId, id));

  const publicBooking = toPublicBooking(
    { ...row, roomIds: roomLinks.map((r) => r.roomId) },
    session
  );

  return NextResponse.json(publicBooking);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;
  const session = authResult;
  const { id } = await params;

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Anfrage nicht gefunden." }, { status: 404 });
  }

  const [updated] = await db
    .update(bookings)
    .set({
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.adminNotes !== undefined ? { adminNotes: parsed.data.adminNotes } : {}),
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, id))
    .returning();

  if (parsed.data.status && NOTIFY_STATUSES.has(parsed.data.status) && updated.requesterEmail) {
    const roomRows = await db
      .select({ name: rooms.name })
      .from(bookingRooms)
      .innerJoin(rooms, eq(bookingRooms.roomId, rooms.id))
      .where(eq(bookingRooms.bookingId, id));

    await sendBookingStatusUpdate({
      requesterEmail: updated.requesterEmail,
      requesterName: updated.requesterName ?? "",
      roomNames: roomRows.map((r) => r.name),
      dateRangeLabel: formatDateTimeRange(updated.startAt, updated.endAt),
      statusLabel: BOOKING_STATUS_LABELS[updated.status],
      statusIsPositive: updated.status === "approved",
    });
  }

  await logAudit({
    entityType: "booking",
    entityId: id,
    action: parsed.data.status ? `status_changed:${parsed.data.status}` : "notes_updated",
    actorUserId: session.user.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json(updated);
}
