import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getWeekEvents } from "@/lib/calendar-data";
import { startOfWeekISO } from "@/lib/calendar-time";
import { addDaysISO, todayISO } from "@/lib/occurrences";
import { formatDateShort } from "@/lib/tz";
import { RoomCalendar } from "@/components/calendar/room-calendar";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Raumkalender" };

export default async function RaumKalenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ raumId: string }>;
  searchParams: Promise<{ datum?: string }>;
}) {
  const { raumId } = await params;
  const sp = await searchParams;

  const raum = await prisma.raum.findUnique({
    where: { id: raumId },
    select: { id: true, name: true, sizeSqm: true, capacity: true, etage: { select: { name: true } } },
  });
  if (!raum) notFound();

  const heute = todayISO();
  const datum = /^\d{4}-\d{2}-\d{2}$/.test(sp.datum ?? "") ? sp.datum! : heute;
  const mondayISO = startOfWeekISO(datum);
  const events = await getWeekEvents({ mondayISO, raumIds: [raumId] });

  const wocheLabel = `${formatDateShort(new Date(`${mondayISO}T12:00:00`))} – ${formatDateShort(
    new Date(`${addDaysISO(mondayISO, 6)}T12:00:00`)
  )}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/kalender" aria-label="Zurück zur Übersicht">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold leading-tight">{raum.name}</h1>
            <p className="text-xs text-muted-foreground">
              {raum.etage.name}
              {raum.sizeSqm ? ` · ${raum.sizeSqm.toString()} m²` : ""}
              {raum.capacity ? ` · bis ${raum.capacity} Personen` : ""}
            </p>
          </div>
        </div>
        <CalendarNav
          label={wocheLabel}
          prevHref={`/kalender/raum/${raumId}?datum=${addDaysISO(mondayISO, -7)}`}
          nextHref={`/kalender/raum/${raumId}?datum=${addDaysISO(mondayISO, 7)}`}
          todayHref={`/kalender/raum/${raumId}?datum=${heute}`}
        />
      </div>

      <RoomCalendar
        raumId={raumId}
        mondayISO={mondayISO}
        activeDateISO={datum}
        events={events}
        canBook
        basePath={`/kalender/raum/${raumId}`}
      />
    </div>
  );
}
