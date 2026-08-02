import "server-only";
import { eq, isNull, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, bookingRooms, rooms, bookingSeries, bookingSeriesRooms } from "@/lib/db/schema";

function groupRoomNames<K extends string>(
  links: { key: K; roomName: string }[]
): Map<K, string[]> {
  const map = new Map<K, string[]>();
  for (const link of links) {
    const arr = map.get(link.key) ?? [];
    arr.push(link.roomName);
    map.set(link.key, arr);
  }
  return map;
}

export async function listStandaloneBookings() {
  const rows = await db
    .select()
    .from(bookings)
    .where(isNull(bookings.seriesId))
    .orderBy(desc(bookings.createdAt));

  const ids = rows.map((r) => r.id);
  const links = ids.length
    ? await db
        .select({ key: bookingRooms.bookingId, roomName: rooms.name })
        .from(bookingRooms)
        .innerJoin(rooms, eq(bookingRooms.roomId, rooms.id))
        .where(inArray(bookingRooms.bookingId, ids))
    : [];
  const roomsById = groupRoomNames(links);

  return rows.map((r) => ({ ...r, roomNames: roomsById.get(r.id) ?? [] }));
}

export async function listSeries() {
  const rows = await db.select().from(bookingSeries).orderBy(desc(bookingSeries.createdAt));

  const ids = rows.map((r) => r.id);
  const links = ids.length
    ? await db
        .select({ key: bookingSeriesRooms.seriesId, roomName: rooms.name })
        .from(bookingSeriesRooms)
        .innerJoin(rooms, eq(bookingSeriesRooms.roomId, rooms.id))
        .where(inArray(bookingSeriesRooms.seriesId, ids))
    : [];
  const roomsById = groupRoomNames(links);

  return rows.map((r) => ({ ...r, roomNames: roomsById.get(r.id) ?? [] }));
}

export async function listOwnBookings(userId: string) {
  const rows = await db
    .select()
    .from(bookings)
    .where(eq(bookings.createdByUserId, userId))
    .orderBy(desc(bookings.startAt));

  const ids = rows.map((r) => r.id);
  const links = ids.length
    ? await db
        .select({ key: bookingRooms.bookingId, roomName: rooms.name })
        .from(bookingRooms)
        .innerJoin(rooms, eq(bookingRooms.roomId, rooms.id))
        .where(inArray(bookingRooms.bookingId, ids))
    : [];
  const roomsById = groupRoomNames(links);

  return rows.map((r) => ({ ...r, roomNames: roomsById.get(r.id) ?? [] }));
}

export async function listOwnSeries(userId: string) {
  const rows = await db
    .select()
    .from(bookingSeries)
    .where(eq(bookingSeries.createdByUserId, userId))
    .orderBy(desc(bookingSeries.createdAt));

  const ids = rows.map((r) => r.id);
  const links = ids.length
    ? await db
        .select({ key: bookingSeriesRooms.seriesId, roomName: rooms.name })
        .from(bookingSeriesRooms)
        .innerJoin(rooms, eq(bookingSeriesRooms.roomId, rooms.id))
        .where(inArray(bookingSeriesRooms.seriesId, ids))
    : [];
  const roomsById = groupRoomNames(links);

  return rows.map((r) => ({ ...r, roomNames: roomsById.get(r.id) ?? [] }));
}

export async function getStandaloneBookingWithRooms(id: string) {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!row) return null;
  const links = await db
    .select({ roomId: rooms.id, roomName: rooms.name })
    .from(bookingRooms)
    .innerJoin(rooms, eq(bookingRooms.roomId, rooms.id))
    .where(eq(bookingRooms.bookingId, id));
  return { ...row, rooms: links };
}

export async function getSeriesWithRooms(id: string) {
  const [row] = await db.select().from(bookingSeries).where(eq(bookingSeries.id, id)).limit(1);
  if (!row) return null;
  const links = await db
    .select({ roomId: rooms.id, roomName: rooms.name })
    .from(bookingSeriesRooms)
    .innerJoin(rooms, eq(bookingSeriesRooms.roomId, rooms.id))
    .where(eq(bookingSeriesRooms.seriesId, id));
  const occurrenceCount = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(eq(bookings.seriesId, id));
  return { ...row, rooms: links, occurrenceCount: occurrenceCount.length };
}
