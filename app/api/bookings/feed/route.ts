import { NextRequest, NextResponse } from "next/server";
import { and, gt, lt, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, bookingRooms } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { toPublicBooking, isAnonymizedBooking } from "@/lib/anonymize";
import { BOOKING_STATUS_LABELS } from "@/lib/labels";

const PUBLICLY_VISIBLE_STATUSES = ["approved", "contract_sent", "confirmed"] as const;

export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = request.nextUrl;
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const roomId = searchParams.get("roomId");

  if (!start || !end) {
    return NextResponse.json({ error: "start und end sind erforderlich." }, { status: 400 });
  }

  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Ungültiger Zeitraum." }, { status: 400 });
  }

  const isAdmin = session?.user?.role === "admin";

  const conditions = [lt(bookings.startAt, endDate), gt(bookings.endAt, startDate)];
  if (!isAdmin) {
    conditions.push(inArray(bookings.status, PUBLICLY_VISIBLE_STATUSES));
  }

  const rows = await db
    .select()
    .from(bookings)
    .where(and(...conditions));

  const ids = rows.map((r) => r.id);
  const roomLinks = ids.length
    ? await db
        .select({ bookingId: bookingRooms.bookingId, roomId: bookingRooms.roomId })
        .from(bookingRooms)
        .where(inArray(bookingRooms.bookingId, ids))
    : [];

  const roomsByBooking = new Map<string, string[]>();
  for (const link of roomLinks) {
    const arr = roomsByBooking.get(link.bookingId) ?? [];
    arr.push(link.roomId);
    roomsByBooking.set(link.bookingId, arr);
  }

  let withRooms = rows.map((row) => ({ ...row, roomIds: roomsByBooking.get(row.id) ?? [] }));

  if (roomId) {
    withRooms = withRooms.filter((b) => b.roomIds.includes(roomId));
  }

  const events = withRooms.map((booking) => {
    const publicBooking = toPublicBooking(booking, session);
    const anonymized = isAnonymizedBooking(publicBooking);

    return {
      id: booking.id,
      title: anonymized
        ? publicBooking.label
        : `${publicBooking.requesterName} · ${BOOKING_STATUS_LABELS[publicBooking.status]}`,
      start: booking.startAt.toISOString(),
      end: booking.endAt.toISOString(),
      roomIds: booking.roomIds,
      status: booking.status,
      anonymized,
    };
  });

  return NextResponse.json(events);
}
