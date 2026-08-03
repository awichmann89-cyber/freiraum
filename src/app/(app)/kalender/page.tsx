import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getWeekEvents } from "@/lib/calendar-data";
import { startOfWeekISO } from "@/lib/calendar-time";
import { addDaysISO, todayISO } from "@/lib/occurrences";
import { formatDate } from "@/lib/tz";
import { AllRoomsDay } from "@/components/calendar/all-rooms-day";
import { CalendarNav } from "@/components/calendar/calendar-nav";

export const metadata: Metadata = { title: "Kalender" };

export default async function KalenderPage({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string }>;
}) {
  const params = await searchParams;
  const heute = todayISO();
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(params.datum ?? "") ? params.datum! : heute;
  const mondayISO = startOfWeekISO(datum);

  const [raeume, events] = await Promise.all([
    prisma.raum.findMany({
      where: { isActive: true },
      orderBy: [{ etage: { level: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, etage: { select: { name: true } } },
    }),
    getWeekEvents({ mondayISO }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Alle Räume</h1>
        <CalendarNav
          label={formatDate(new Date(`${datum}T12:00:00`))}
          prevHref={`/kalender?datum=${addDaysISO(datum, -1)}`}
          nextHref={`/kalender?datum=${addDaysISO(datum, 1)}`}
          todayHref={`/kalender?datum=${heute}`}
        />
      </div>

      {raeume.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Räume angelegt.</p>
      ) : (
        <AllRoomsDay
          dateISO={datum}
          rooms={raeume.map((r) => ({ id: r.id, name: r.name, etageName: r.etage.name }))}
          events={events}
          canBook
          roomHrefBase="/kalender/raum"
        />
      )}
    </div>
  );
}
