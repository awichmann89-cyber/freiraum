import { notFound } from "next/navigation";
import { getSeriesWithRooms } from "@/lib/queries/bookings";
import { describeStoredRRule } from "@/lib/recurrence-label";
import { CreateContractForm } from "@/components/contract/create-contract-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NeuerVertragSeriesPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  const series = await getSeriesWithRooms(seriesId);
  if (!series || series.type !== "external_rental") {
    notFound();
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Vertrag erstellen</h1>
      <Card>
        <CardHeader>
          <CardTitle>Neuer Mietvertrag (Serie)</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateContractForm
            seriesId={series.id}
            renterName={series.requesterName ?? ""}
            roomNames={series.rooms.map((r) => r.roomName)}
            scheduleLabel={describeStoredRRule(
              series.rrule,
              series.seriesStartDate,
              series.seriesEndDate,
              series.startTime.slice(0, 5),
              series.endTime.slice(0, 5)
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
