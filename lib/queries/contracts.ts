import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bookings,
  bookingRooms,
  bookingSeries,
  bookingSeriesRooms,
  contracts,
  rooms,
} from "@/lib/db/schema";
import { formatDateTimeRange } from "@/lib/format";
import { describeStoredRRule } from "@/lib/recurrence-label";
import type { Contract } from "@/lib/db/types";

export interface ContractContext {
  renterName: string;
  renterEmail: string;
  renterPhone: string | null;
  roomNames: string[];
  scheduleLabel: string;
}

export async function getContractContext(contract: Contract): Promise<ContractContext | null> {
  if (contract.bookingId) {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, contract.bookingId))
      .limit(1);
    if (!booking) return null;

    const roomRows = await db
      .select({ name: rooms.name })
      .from(bookingRooms)
      .innerJoin(rooms, eq(bookingRooms.roomId, rooms.id))
      .where(eq(bookingRooms.bookingId, booking.id));

    return {
      renterName: booking.requesterName ?? "",
      renterEmail: booking.requesterEmail ?? "",
      renterPhone: booking.requesterPhone,
      roomNames: roomRows.map((r) => r.name),
      scheduleLabel: formatDateTimeRange(booking.startAt, booking.endAt),
    };
  }

  if (contract.seriesId) {
    const [series] = await db
      .select()
      .from(bookingSeries)
      .where(eq(bookingSeries.id, contract.seriesId))
      .limit(1);
    if (!series) return null;

    const roomRows = await db
      .select({ name: rooms.name })
      .from(bookingSeriesRooms)
      .innerJoin(rooms, eq(bookingSeriesRooms.roomId, rooms.id))
      .where(eq(bookingSeriesRooms.seriesId, series.id));

    return {
      renterName: series.requesterName ?? "",
      renterEmail: series.requesterEmail ?? "",
      renterPhone: series.requesterPhone,
      roomNames: roomRows.map((r) => r.name),
      scheduleLabel: describeStoredRRule(
        series.rrule,
        series.seriesStartDate,
        series.seriesEndDate,
        series.startTime.slice(0, 5),
        series.endTime.slice(0, 5)
      ),
    };
  }

  return null;
}

export async function listContractsWithContext() {
  const rows = await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  return Promise.all(
    rows.map(async (contract) => ({
      contract,
      context: await getContractContext(contract),
    }))
  );
}

export async function getContractWithContext(id: string) {
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (!contract) return null;
  const context = await getContractContext(contract);
  return { contract, context };
}
