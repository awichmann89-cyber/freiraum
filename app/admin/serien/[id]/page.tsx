import { notFound } from "next/navigation";
import { getSeriesWithRooms } from "@/lib/queries/bookings";
import { describeStoredRRule } from "@/lib/recurrence-label";
import { SERIES_STATUS_LABELS, BOOKING_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeriesStatusActions } from "./series-status-actions";

export default async function AdminSeriesDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const series = await getSeriesWithRooms(id);
  if (!series) {
    notFound();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{series.requesterName}</h1>
        <Badge variant="secondary">{SERIES_STATUS_LABELS[series.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Typ:</strong> {BOOKING_TYPE_LABELS[series.type]}
          </p>
          <p>
            <strong>E-Mail:</strong> {series.requesterEmail}
          </p>
          {series.requesterPhone ? (
            <p>
              <strong>Telefon:</strong> {series.requesterPhone}
            </p>
          ) : null}
          <p>
            <strong>Räume:</strong> {series.rooms.map((r) => r.roomName).join(", ") || "–"}
          </p>
          <p>
            <strong>Serie:</strong>{" "}
            {describeStoredRRule(
              series.rrule,
              series.seriesStartDate,
              series.seriesEndDate,
              series.startTime.slice(0, 5),
              series.endTime.slice(0, 5)
            )}
          </p>
          {series.status === "approved" ? (
            <p>
              <strong>Angelegte Termine:</strong> {series.occurrenceCount}
            </p>
          ) : null}
          {series.message ? (
            <p>
              <strong>Nachricht:</strong> {series.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <SeriesStatusActions series={series} />
        </CardContent>
      </Card>
    </div>
  );
}
