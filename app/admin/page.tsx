import Link from "next/link";
import { listStandaloneBookings, listSeries } from "@/lib/queries/bookings";
import { formatDateTimeRange } from "@/lib/format";
import { describeStoredRRule } from "@/lib/recurrence-label";
import { BOOKING_TYPE_LABELS } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { QuickBookingActions, QuickSeriesActions } from "@/components/admin/quick-request-actions";

export default async function AdminDashboardPage() {
  const [allBookings, allSeries] = await Promise.all([listStandaloneBookings(), listSeries()]);

  const pendingBookings = allBookings.filter(
    (b) => b.status === "requested" || b.status === "in_review"
  );
  const pendingSeries = allSeries.filter((s) => s.status === "requested");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            Offene Anfragen ({pendingBookings.length + pendingSeries.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingBookings.length === 0 && pendingSeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine offenen Anfragen.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Anfragende:r</TableHead>
                  <TableHead>Räume</TableHead>
                  <TableHead>Termin</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <Link href={`/admin/anfragen/${booking.id}`} className="hover:underline">
                        {booking.requesterName}
                      </Link>
                    </TableCell>
                    <TableCell>{booking.roomNames.join(", ") || "–"}</TableCell>
                    <TableCell>{formatDateTimeRange(booking.startAt, booking.endAt)}</TableCell>
                    <TableCell>{BOOKING_TYPE_LABELS[booking.type]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <QuickBookingActions id={booking.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingSeries.map((series) => (
                  <TableRow key={series.id}>
                    <TableCell>
                      <Link href={`/admin/serien/${series.id}`} className="hover:underline">
                        {series.requesterName}
                      </Link>
                    </TableCell>
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
                    <TableCell>{BOOKING_TYPE_LABELS[series.type]}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <QuickSeriesActions id={series.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kalender</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Alle Räume auf einen Blick.</p>
          <Link href="/admin/kalender" className="text-sm text-primary hover:underline">
            Zum Kalender
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
