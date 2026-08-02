import type { InferSelectModel } from "drizzle-orm";
import type { bookings } from "@/lib/db/schema";

type BookingRow = InferSelectModel<typeof bookings>;

export type BookingWithRooms = BookingRow & { roomIds: string[] };

export interface AnonymizedBooking {
  id: string;
  startAt: Date;
  endAt: Date;
  status: BookingRow["status"];
  type: BookingRow["type"];
  roomIds: string[];
  isSeriesException: boolean;
  seriesId: string | null;
  label: string;
}

export interface AnonymizeSession {
  user?: {
    id: string;
    role: "admin" | "group";
  };
}

/**
 * Single enforcement point for role-based field stripping on bookings.
 *
 * Admins see everything. A group sees full details of bookings it created
 * itself (it already knows its own contact info/message). Everyone else
 * (anonymous public visitors, other groups) only ever gets the fields needed
 * to render a "busy" calendar slot — never requester contact info, message,
 * or internal admin notes.
 */
export function toPublicBooking(
  booking: BookingWithRooms,
  session: AnonymizeSession | null
): BookingWithRooms | AnonymizedBooking {
  const isAdmin = session?.user?.role === "admin";
  const isOwner = Boolean(session?.user?.id && booking.createdByUserId === session.user.id);

  if (isAdmin || isOwner) {
    return booking;
  }

  return {
    id: booking.id,
    startAt: booking.startAt,
    endAt: booking.endAt,
    status: booking.status,
    type: booking.type,
    roomIds: booking.roomIds,
    isSeriesException: booking.isSeriesException,
    seriesId: booking.seriesId,
    label: "Belegt",
  };
}

export function isAnonymizedBooking(
  booking: BookingWithRooms | AnonymizedBooking
): booking is AnonymizedBooking {
  return "label" in booking;
}
