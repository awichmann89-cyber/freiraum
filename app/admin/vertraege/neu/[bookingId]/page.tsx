import { notFound } from "next/navigation";
import { getStandaloneBookingWithRooms } from "@/lib/queries/bookings";
import { formatDateTimeRange } from "@/lib/format";
import { CreateContractForm } from "@/components/contract/create-contract-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NeuerVertragBookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const booking = await getStandaloneBookingWithRooms(bookingId);
  if (!booking || booking.type !== "external_rental") {
    notFound();
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Vertrag erstellen</h1>
      <Card>
        <CardHeader>
          <CardTitle>Neuer Mietvertrag</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateContractForm
            bookingId={booking.id}
            renterName={booking.requesterName ?? ""}
            roomNames={booking.rooms.map((r) => r.roomName)}
            scheduleLabel={formatDateTimeRange(booking.startAt, booking.endAt)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
