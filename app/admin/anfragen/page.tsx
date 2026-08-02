import Link from "next/link";
import { listStandaloneBookings, listSeries } from "@/lib/queries/bookings";
import { formatDateTimeRange } from "@/lib/format";
import { describeStoredRRule } from "@/lib/recurrence-label";
import { BOOKING_STATUS_LABELS, SERIES_STATUS_LABELS, BOOKING_TYPE_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAnfragenPage() {
  const [standaloneBookings, series] = await Promise.all([listStandaloneBookings(), listSeries()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Anfragen</h1>
        <p className="text-muted-foreground">Eingehende Einzel- und Serienanfragen prüfen.</p>
      </div>
      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Einzeltermine ({standaloneBookings.length})</TabsTrigger>
          <TabsTrigger value="series">Serien ({series.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anfragende:r</TableHead>
                <TableHead>Räume</TableHead>
                <TableHead>Termin</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standaloneBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell>
                    <Link href={`/admin/anfragen/${booking.id}`} className="hover:underline">
                      {booking.requesterName}
                    </Link>
                  </TableCell>
                  <TableCell>{booking.roomNames.join(", ") || "–"}</TableCell>
                  <TableCell>{formatDateTimeRange(booking.startAt, booking.endAt)}</TableCell>
                  <TableCell>{BOOKING_TYPE_LABELS[booking.type]}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{BOOKING_STATUS_LABELS[booking.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {standaloneBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Keine Einzeltermin-Anfragen.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="series" className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anfragende:r</TableHead>
                <TableHead>Räume</TableHead>
                <TableHead>Serie</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {series.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link href={`/admin/serien/${s.id}`} className="hover:underline">
                      {s.requesterName}
                    </Link>
                  </TableCell>
                  <TableCell>{s.roomNames.join(", ") || "–"}</TableCell>
                  <TableCell>
                    {describeStoredRRule(
                      s.rrule,
                      s.seriesStartDate,
                      s.seriesEndDate,
                      s.startTime.slice(0, 5),
                      s.endTime.slice(0, 5)
                    )}
                  </TableCell>
                  <TableCell>{BOOKING_TYPE_LABELS[s.type]}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{SERIES_STATUS_LABELS[s.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {series.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Keine Serienanfragen.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
