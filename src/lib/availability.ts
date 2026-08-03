import { prisma } from "@/lib/prisma";
import type { Interval } from "@/lib/occurrences";
import type { BuchungsArt, Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type BelegungsLevel = "FREI" | "TEILWEISE_BELEGT" | "VOLL_BELEGT";

export type KonfliktBuchung = {
  buchungId: string;
  art: BuchungsArt;
  start: Date;
  end: Date;
  titel: string;
  gruppeName?: string | null;
};

export type IntervalErgebnis = {
  interval: Interval;
  level: BelegungsLevel;
  konflikte: KonfliktBuchung[];
};

/**
 * Reine Kernlogik: ordnet jedem Intervall die überlappenden Buchungen zu und
 * bestimmt per Coverage-Sweep, ob es frei, teilweise oder voll belegt ist.
 * Intervalle sind halboffen [start, end) — Rücken-an-Rücken kollidiert nicht.
 */
export function classifyIntervals(
  intervals: Interval[],
  buchungen: KonfliktBuchung[]
): IntervalErgebnis[] {
  const sorted = [...buchungen].sort((a, b) => a.start.getTime() - b.start.getTime());

  return intervals.map((interval) => {
    const konflikte = sorted.filter(
      (b) => b.start.getTime() < interval.end.getTime() && b.end.getTime() > interval.start.getTime()
    );

    if (konflikte.length === 0) {
      return { interval, level: "FREI" as const, konflikte };
    }

    let cursor = interval.start.getTime();
    let luecke = false;
    for (const b of konflikte) {
      if (b.start.getTime() > cursor) {
        luecke = true;
        break;
      }
      cursor = Math.max(cursor, b.end.getTime());
    }
    const voll = !luecke && cursor >= interval.end.getTime();

    return {
      interval,
      level: voll ? ("VOLL_BELEGT" as const) : ("TEILWEISE_BELEGT" as const),
      konflikte,
    };
  });
}

export type CheckAvailabilityOptions = {
  /** Serientermine dieser Serie ignorieren (z.B. beim Verschieben). */
  excludeSerieId?: string;
  /** Konkrete Buchungen ignorieren. */
  excludeBuchungIds?: string[];
  /** Nur diese Buchungsarten als Konflikt werten (Default: alle). */
  arten?: BuchungsArt[];
  /** Für Re-Checks innerhalb einer Transaktion. */
  db?: Db;
};

/** Prüft N Intervalle eines Raums gegen alle BESTAETIGTen Buchungen (eine Query). */
export async function checkAvailability(
  raumId: string,
  intervals: Interval[],
  opts?: CheckAvailabilityOptions
): Promise<IntervalErgebnis[]> {
  if (intervals.length === 0) return [];

  const windowStart = new Date(Math.min(...intervals.map((i) => i.start.getTime())));
  const windowEnd = new Date(Math.max(...intervals.map((i) => i.end.getTime())));

  const db = opts?.db ?? prisma;
  const rows = await db.buchung.findMany({
    where: {
      raumId,
      status: "BESTAETIGT",
      startsAt: { lt: windowEnd },
      endsAt: { gt: windowStart },
      ...(opts?.arten ? { art: { in: opts.arten } } : {}),
      ...(opts?.excludeSerieId ? { OR: [{ serieId: null }, { serieId: { not: opts.excludeSerieId } }] } : {}),
      ...(opts?.excludeBuchungIds?.length ? { id: { notIn: opts.excludeBuchungIds } } : {}),
    },
    include: { gruppe: { select: { name: true } } },
    orderBy: { startsAt: "asc" },
  });

  return classifyIntervals(
    intervals,
    rows.map((b) => ({
      buchungId: b.id,
      art: b.art,
      start: b.startsAt,
      end: b.endsAt,
      titel: b.titel,
      gruppeName: b.gruppe?.name ?? null,
    }))
  );
}
