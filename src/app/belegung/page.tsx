import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { getPublicWeekOccupancy } from "@/lib/calendar-data";
import { startOfWeekISO } from "@/lib/calendar-time";
import { addDaysISO, todayISO } from "@/lib/occurrences";
import { formatDate } from "@/lib/tz";
import { PUBLIC_BROWSE_MONATE } from "@/lib/constants";
import { AllRoomsDay } from "@/components/calendar/all-rooms-day";
import { CalendarNav } from "@/components/calendar/calendar-nav";

export const metadata: Metadata = { title: "Aktuelle Belegung" };

export const dynamic = "force-dynamic";

export default async function BelegungPage({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string }>;
}) {
  const sp = await searchParams;
  const heute = todayISO();
  const maxDatum = addDaysISO(heute, PUBLIC_BROWSE_MONATE * 31);

  let datum = /^\d{4}-\d{2}-\d{2}$/.test(sp.datum ?? "") ? sp.datum! : heute;
  if (datum < heute) datum = heute;
  if (datum > maxDatum) datum = maxDatum;

  const mondayISO = startOfWeekISO(datum);
  const [raeume, events] = await Promise.all([
    prisma.raum.findMany({
      where: { isActive: true },
      orderBy: [{ etage: { level: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, etage: { select: { name: true } } },
    }),
    getPublicWeekOccupancy(mondayISO),
  ]);

  return (
    <div className="min-h-dvh">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">Freiraum</span>
          <div className="flex items-center gap-2">
            <Button size="sm" asChild>
              <Link href="/anfrage">Raum anfragen</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/login">Anmelden</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-4 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Aktuelle Belegung</h1>
            <p className="text-sm text-muted-foreground">
              Belegte Zeiten sind grau markiert — ohne Angabe, von wem. Für eine Buchung nutze
              „Raum anfragen&ldquo;.
            </p>
          </div>
          <CalendarNav
            label={formatDate(new Date(`${datum}T12:00:00`))}
            prevHref={`/belegung?datum=${addDaysISO(datum, -1)}`}
            nextHref={`/belegung?datum=${addDaysISO(datum, 1)}`}
            todayHref={`/belegung?datum=${heute}`}
          />
        </div>

        {raeume.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Räume eingerichtet.</p>
        ) : (
          <AllRoomsDay
            dateISO={datum}
            rooms={raeume.map((r) => ({ id: r.id, name: r.name, etageName: r.etage.name }))}
            events={events}
          />
        )}
      </main>
    </div>
  );
}
