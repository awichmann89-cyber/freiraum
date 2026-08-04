import { prisma } from "@/lib/prisma";
import { berlinInstant, addDaysISO, expandWeekly, dbDateToISO } from "@/lib/occurrences";
import { splitIntoBerlinDays } from "@/lib/calendar-time";

/** Serialisierbares View-Model für den Kalender — vor der Client-Grenze erzeugt. */
export type CalendarEventVM = {
  id: string;
  roomId: string;
  roomName?: string;
  dateISO: string; // Berliner Kalendertag des Segments
  startMin: number; // Wandzeit-Minuten seit Mitternacht
  endMin: number;
  title?: string;
  subtitle?: string;
  kind: "internal" | "external" | "busy";
  status: "confirmed" | "pending";
  isRecurring?: boolean;
  color?: string | null;
  // Nur interne Ansicht (getWeekEvents), für Absagen/Bearbeiten im Details-Sheet.
  // startsAtISO/endsAtISO sind die ECHTEN Buchungsgrenzen (Events werden pro Tag segmentiert).
  buchungId?: string;
  serieId?: string | null;
  gruppeId?: string | null;
  startsAtISO?: string;
  endsAtISO?: string;
  serie?: {
    weekday: number;
    startTime: string;
    endTime: string;
    intervalWeeks: number;
    endDateISO: string | null;
  } | null;
};

function dateFromISO(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/**
 * Bestätigte Buchungen + offene Anfrage-Posten einer Woche als Kalender-Events.
 * Interne Ansicht: mit Titeln und Gruppennamen.
 */
export async function getWeekEvents(opts: {
  mondayISO: string;
  raumIds?: string[];
  includePending?: boolean;
}): Promise<CalendarEventVM[]> {
  const { mondayISO, raumIds, includePending = true } = opts;
  const sundayISO = addDaysISO(mondayISO, 6);
  const windowStart = berlinInstant(mondayISO, "00:00");
  const windowEnd = berlinInstant(addDaysISO(mondayISO, 7), "00:00");

  const events: CalendarEventVM[] = [];

  const buchungen = await prisma.buchung.findMany({
    where: {
      status: "BESTAETIGT",
      ...(raumIds ? { raumId: { in: raumIds } } : {}),
      startsAt: { lt: windowEnd },
      endsAt: { gt: windowStart },
    },
    include: {
      gruppe: { select: { name: true, color: true } },
      raum: { select: { name: true } },
      serie: {
        select: {
          weekday: true,
          startTime: true,
          endTime: true,
          intervalWeeks: true,
          endDate: true,
        },
      },
    },
    orderBy: { startsAt: "asc" },
  });

  for (const b of buchungen) {
    for (const seg of splitIntoBerlinDays(b.startsAt, b.endsAt)) {
      if (seg.dateISO < mondayISO || seg.dateISO > sundayISO) continue;
      events.push({
        id: `b-${b.id}-${seg.dateISO}`,
        roomId: b.raumId,
        roomName: b.raum.name,
        dateISO: seg.dateISO,
        startMin: seg.startMin,
        endMin: seg.endMin,
        title: b.titel,
        subtitle: b.art === "GRUPPE" ? b.gruppe?.name : "Vermietung",
        kind: b.art === "GRUPPE" ? "internal" : "external",
        status: "confirmed",
        isRecurring: !!b.serieId,
        color: b.gruppe?.color ?? null,
        buchungId: b.id,
        serieId: b.serieId,
        gruppeId: b.gruppeId,
        startsAtISO: b.startsAt.toISOString(),
        endsAtISO: b.endsAt.toISOString(),
        serie: b.serie
          ? {
              weekday: b.serie.weekday,
              startTime: b.serie.startTime,
              endTime: b.serie.endTime,
              intervalWeeks: b.serie.intervalWeeks,
              endDateISO: b.serie.endDate ? dbDateToISO(b.serie.endDate) : null,
            }
          : null,
      });
    }
  }

  if (includePending) {
    const posten = await prisma.anfragePosten.findMany({
      where: {
        status: "ANGEFRAGT",
        ...(raumIds ? { raumId: { in: raumIds } } : {}),
        OR: [
          { art: "EINZEL", startsAt: { lt: windowEnd }, endsAt: { gt: windowStart } },
          {
            art: "WOECHENTLICH",
            firstDate: { lte: dateFromISO(sundayISO) },
            OR: [{ endDate: null }, { endDate: { gte: dateFromISO(mondayISO) } }],
          },
        ],
      },
      include: {
        anfrage: { include: { gruppe: { select: { name: true, color: true } } } },
        raum: { select: { name: true } },
      },
    });

    for (const p of posten) {
      const intervals =
        p.art === "EINZEL"
          ? p.startsAt && p.endsAt
            ? [{ start: p.startsAt, end: p.endsAt }]
            : []
          : expandWeekly(
              {
                weekday: p.weekday!,
                startTime: p.startTime!,
                endTime: p.endTime!,
                firstDate: dbDateToISO(p.firstDate!),
                endDate: p.endDate ? dbDateToISO(p.endDate) : null,
                intervalWeeks: p.intervalWeeks ?? 1,
              },
              sundayISO,
              mondayISO
            );

      for (const iv of intervals) {
        for (const seg of splitIntoBerlinDays(iv.start, iv.end)) {
          if (seg.dateISO < mondayISO || seg.dateISO > sundayISO) continue;
          events.push({
            id: `p-${p.id}-${seg.dateISO}`,
            roomId: p.raumId,
            roomName: p.raum.name,
            dateISO: seg.dateISO,
            startMin: seg.startMin,
            endMin: seg.endMin,
            title: p.titel,
            subtitle: `Anfrage · ${p.anfrage.gruppe.name}`,
            kind: "internal",
            status: "pending",
            isRecurring: p.art === "WOECHENTLICH",
            color: p.anfrage.gruppe.color,
          });
        }
      }
    }
  }

  return events;
}

/**
 * Öffentliche, anonymisierte Belegung: eigene Projektion — nur Raum + Zeitblock,
 * keine Titel, keine Gruppennamen. Diese Funktion NIE mit der internen mischen.
 */
export async function getPublicWeekOccupancy(mondayISO: string): Promise<CalendarEventVM[]> {
  const sundayISO = addDaysISO(mondayISO, 6);
  const windowStart = berlinInstant(mondayISO, "00:00");
  const windowEnd = berlinInstant(addDaysISO(mondayISO, 7), "00:00");

  const buchungen = await prisma.buchung.findMany({
    where: {
      status: "BESTAETIGT",
      startsAt: { lt: windowEnd },
      endsAt: { gt: windowStart },
      raum: { isActive: true },
    },
    select: { id: true, raumId: true, startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
  });

  const events: CalendarEventVM[] = [];
  for (const b of buchungen) {
    for (const seg of splitIntoBerlinDays(b.startsAt, b.endsAt)) {
      if (seg.dateISO < mondayISO || seg.dateISO > sundayISO) continue;
      events.push({
        id: `o-${b.id}-${seg.dateISO}`,
        roomId: b.raumId,
        dateISO: seg.dateISO,
        startMin: seg.startMin,
        endMin: seg.endMin,
        kind: "busy",
        status: "confirmed",
      });
    }
  }
  return events;
}
