import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookingSeries, bookingSeriesRooms, bookings, bookingRooms, rooms } from "@/lib/db/schema";
import { requireAdmin, isResponse } from "@/lib/api-auth";
import { expandSeriesOccurrences } from "@/lib/series/expand";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-ip";
import { sendBookingStatusUpdate } from "@/lib/email/booking";
import { describeStoredRRule } from "@/lib/recurrence-label";
import { SERIES_STATUS_LABELS } from "@/lib/labels";

const patchSchema = z.object({
  status: z.enum(["approved", "rejected", "cancelled"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;
  const { id } = await params;

  const [series] = await db.select().from(bookingSeries).where(eq(bookingSeries.id, id)).limit(1);
  if (!series) {
    return NextResponse.json({ error: "Serie nicht gefunden." }, { status: 404 });
  }

  const roomLinks = await db
    .select({ roomId: bookingSeriesRooms.roomId })
    .from(bookingSeriesRooms)
    .where(eq(bookingSeriesRooms.seriesId, id));

  return NextResponse.json({ ...series, roomIds: roomLinks.map((r) => r.roomId) });
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

  const [series] = await db.select().from(bookingSeries).where(eq(bookingSeries.id, id)).limit(1);
  if (!series) {
    return NextResponse.json({ error: "Serie nicht gefunden." }, { status: 404 });
  }

  const roomLinks = await db
    .select({ roomId: bookingSeriesRooms.roomId })
    .from(bookingSeriesRooms)
    .where(eq(bookingSeriesRooms.seriesId, id));
  const roomIds = roomLinks.map((r) => r.roomId);

  let occurrenceCount = 0;

  if (parsed.data.status === "approved") {
    const occurrences = expandSeriesOccurrences({
      rruleText: series.rrule,
      seriesStartDate: series.seriesStartDate,
      seriesEndDate: series.seriesEndDate,
      startTime: series.startTime.slice(0, 5),
      endTime: series.endTime.slice(0, 5),
    });
    occurrenceCount = occurrences.length;

    for (const occurrence of occurrences) {
      const [booking] = await db
        .insert(bookings)
        .values({
          seriesId: series.id,
          type: series.type,
          status: "approved",
          requesterName: series.requesterName,
          requesterEmail: series.requesterEmail,
          requesterPhone: series.requesterPhone,
          message: series.message,
          startAt: occurrence.startAt,
          endAt: occurrence.endAt,
          createdByUserId: series.createdByUserId,
          reviewedByUserId: session.user.id,
          reviewedAt: new Date(),
        })
        .returning();

      if (roomIds.length > 0) {
        await db
          .insert(bookingRooms)
          .values(roomIds.map((roomId) => ({ bookingId: booking.id, roomId })));
      }
    }
  }

  const [updatedSeries] = await db
    .update(bookingSeries)
    .set({
      status: parsed.data.status,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(bookingSeries.id, id))
    .returning();

  if (parsed.data.status === "rejected" || parsed.data.status === "cancelled") {
    // Cascade to any already-generated occurrences (e.g. an approved series being cancelled later)
    // so the calendar stops showing them as booked.
    await db
      .update(bookings)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(bookings.seriesId, id));
  }

  if (updatedSeries.requesterEmail) {
    const roomRows =
      roomIds.length > 0
        ? await db.select({ name: rooms.name }).from(rooms).where(inArray(rooms.id, roomIds))
        : [];

    await sendBookingStatusUpdate({
      requesterEmail: updatedSeries.requesterEmail,
      requesterName: updatedSeries.requesterName ?? "",
      roomNames: roomRows.length > 0 ? roomRows.map((r) => r.name) : ["–"],
      dateRangeLabel: describeStoredRRule(
        updatedSeries.rrule,
        updatedSeries.seriesStartDate,
        updatedSeries.seriesEndDate,
        updatedSeries.startTime.slice(0, 5),
        updatedSeries.endTime.slice(0, 5)
      ),
      statusLabel: SERIES_STATUS_LABELS[updatedSeries.status],
      statusIsPositive: updatedSeries.status === "approved",
      adminNote:
        parsed.data.status === "approved"
          ? `${occurrenceCount} Termine wurden bestätigt.`
          : undefined,
    });
  }

  await logAudit({
    entityType: "booking_series",
    entityId: id,
    action: `status_changed:${parsed.data.status}`,
    actorUserId: session.user.id,
    ipAddress: getClientIp(request),
    metadata: parsed.data.status === "approved" ? { occurrenceCount } : null,
  });

  return NextResponse.json(updatedSeries);
}
