import { notFound } from "next/navigation";
import { getStandaloneBookingWithRooms } from "@/lib/queries/bookings";
import { formatDateTimeRange } from "@/lib/format";
import { BOOKING_STATUS_LABELS, BOOKING_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingStatusActions } from "./booking-status-actions";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getStandaloneBookingWithRooms(id);
  if (!booking) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{booking.requesterName}</h1>
        <Badge variant="secondary">{BOOKING_STATUS_LABELS[booking.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Typ:</strong> {BOOKING_TYPE_LABELS[booking.type]}
          </p>
          <p>
            <strong>E-Mail:</strong> {booking.requesterEmail}
          </p>
          {booking.requesterPhone ? (
            <p>
              <strong>Telefon:</strong> {booking.requesterPhone}
            </p>
          ) : null}
          <p>
            <strong>Räume:</strong> {booking.rooms.map((r) => r.roomName).join(", ") || "–"}
          </p>
          <p>
            <strong>Termin:</strong> {formatDateTimeRange(booking.startAt, booking.endAt)}
          </p>
          {booking.message ? (
            <p>
              <strong>Nachricht:</strong> {booking.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <BookingStatusActions booking={booking} />
        </CardContent>
      </Card>
    </div>
  );
}
