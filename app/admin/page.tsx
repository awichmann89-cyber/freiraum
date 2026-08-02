import Link from "next/link";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { bookings, bookingSeries } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboardPage() {
  const [pendingBookings, pendingSeries] = await Promise.all([
    db
      .select({ id: bookings.id })
      .from(bookings)
      .where(or(eq(bookings.status, "requested"), eq(bookings.status, "in_review"))),
    db.select({ id: bookingSeries.id }).from(bookingSeries).where(eq(bookingSeries.status, "requested")),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Offene Anfragen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">
              {pendingBookings.length + pendingSeries.length}
            </p>
            <Link href="/admin/anfragen" className="text-sm text-primary hover:underline">
              Anfragen ansehen
            </Link>
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
    </div>
  );
}
