import Link from "next/link";
import { auth } from "@/lib/auth";
import { listOwnBookings, listOwnSeries } from "@/lib/queries/bookings";
import { formatDateTimeRange } from "@/lib/format";
import { describeStoredRRule } from "@/lib/recurrence-label";
import { BOOKING_STATUS_LABELS, SERIES_STATUS_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function GruppeDashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [ownBookings, ownSeries] = await Promise.all([
    listOwnBookings(userId),
    listOwnSeries(userId),
  ]);
  const standaloneBookings = ownBookings.filter((b) => !b.seriesId);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Meine Termine</h1>
          <p className="text-muted-foreground">Ihre Einzeltermine und Terminserien.</p>
        </div>
        <Button render={<Link href="/gruppe/neue-buchung" />}>Neue Buchung</Button>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Einzeltermine</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Räume</TableHead>
              <TableHead>Termin</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standaloneBookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell>{booking.roomNames.join(", ") || "–"}</TableCell>
                <TableCell>{formatDateTimeRange(booking.startAt, booking.endAt)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{BOOKING_STATUS_LABELS[booking.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {standaloneBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Keine Einzeltermine.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Terminserien</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Räume</TableHead>
              <TableHead>Serie</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ownSeries.map((series) => (
              <TableRow key={series.id}>
                <TableCell>{series.roomNames.join(", ") || "–"}</TableCell>
                <TableCell>
                  {describeStoredRRule(
                    series.rrule,
                    series.seriesStartDate,
                    series.seriesEndDate,
                    series.startTime.slice(0, 5),
                    series.endTime.slice(0, 5)
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{SERIES_STATUS_LABELS[series.status]}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {ownSeries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Keine Terminserien.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
