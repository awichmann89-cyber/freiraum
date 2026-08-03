import type { AnfragePosten } from "@prisma/client";
import {
  berlinInstant,
  dbDateToISO,
  expandWeekly,
  todayISO,
  type Interval,
} from "@/lib/occurrences";
import { BUCHUNGS_HORIZONT_MONATE } from "@/lib/constants";
import { formatDateShort, formatRange } from "@/lib/tz";
import { beschreibeWoechentlich } from "@/lib/email-templates";
import type { AnfragePostenInput } from "@/lib/zod-schemas";

/** Ende des Buchungshorizonts (heute + 12 Monate) als "yyyy-mm-dd". */
export function horizonISO(now: Date = new Date()): string {
  const heute = todayISO(now);
  const [y, m, d] = heute.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + BUCHUNGS_HORIZONT_MONATE, d, 12));
  return target.toISOString().slice(0, 10);
}

function isoToDeutsch(iso: string): string {
  return formatDateShort(new Date(`${iso}T12:00:00`));
}

/** Intervalle eines Anfrage-Posten (Wizard-Input) — Serien bis zum Horizont expandiert. */
export function postenIntervals(p: AnfragePostenInput, horizon: string = horizonISO()): Interval[] {
  if (p.art === "EINZEL") {
    return [
      { start: berlinInstant(p.startDate, p.startTime), end: berlinInstant(p.endDate, p.endTime) },
    ];
  }
  return expandWeekly(
    {
      weekday: p.weekday,
      startTime: p.startTime,
      endTime: p.endTime,
      firstDate: p.firstDate,
      endDate: p.endDate ?? null,
      intervalWeeks: p.intervalWeeks,
    },
    horizon
  );
}

/** Intervalle eines gespeicherten Anfrage-Posten (DB-Zeile). */
export function postenIntervalsFromDb(
  p: Pick<
    AnfragePosten,
    | "art"
    | "startsAt"
    | "endsAt"
    | "weekday"
    | "startTime"
    | "endTime"
    | "firstDate"
    | "endDate"
    | "intervalWeeks"
  >,
  horizon: string = horizonISO()
): Interval[] {
  if (p.art === "EINZEL") {
    if (!p.startsAt || !p.endsAt) return [];
    return [{ start: p.startsAt, end: p.endsAt }];
  }
  return expandWeekly(
    {
      weekday: p.weekday!,
      startTime: p.startTime!,
      endTime: p.endTime!,
      firstDate: dbDateToISO(p.firstDate!),
      endDate: p.endDate ? dbDateToISO(p.endDate) : null,
      intervalWeeks: p.intervalWeeks ?? 1,
    },
    horizon
  );
}

/** Menschlich lesbare Beschreibung eines Posten (Wizard-Input). */
export function postenBeschreibung(p: AnfragePostenInput): string {
  if (p.art === "EINZEL") {
    return formatRange(
      berlinInstant(p.startDate, p.startTime),
      berlinInstant(p.endDate, p.endTime)
    );
  }
  return beschreibeWoechentlich({
    weekday: p.weekday,
    startTime: p.startTime,
    endTime: p.endTime,
    firstDate: isoToDeutsch(p.firstDate),
    endDate: p.endDate ? isoToDeutsch(p.endDate) : null,
    intervalWeeks: p.intervalWeeks,
  });
}

/** Menschlich lesbare Beschreibung eines gespeicherten Posten (DB-Zeile). */
export function postenBeschreibungFromDb(
  p: Pick<
    AnfragePosten,
    | "art"
    | "startsAt"
    | "endsAt"
    | "weekday"
    | "startTime"
    | "endTime"
    | "firstDate"
    | "endDate"
    | "intervalWeeks"
  >
): string {
  if (p.art === "EINZEL") {
    if (!p.startsAt || !p.endsAt) return "";
    return formatRange(p.startsAt, p.endsAt);
  }
  return beschreibeWoechentlich({
    weekday: p.weekday!,
    startTime: p.startTime!,
    endTime: p.endTime!,
    firstDate: isoToDeutsch(dbDateToISO(p.firstDate!)),
    endDate: p.endDate ? isoToDeutsch(dbDateToISO(p.endDate)) : null,
    intervalWeeks: p.intervalWeeks ?? 1,
  });
}

/** Horizont-/Vergangenheitsvalidierung; liefert Fehlermeldung oder null. */
export function validatePostenDates(p: AnfragePostenInput, now: Date = new Date()): string | null {
  const heute = todayISO(now);
  const horizon = horizonISO(now);
  const startDatum = p.art === "EINZEL" ? p.startDate : p.firstDate;

  if (startDatum < heute) return "Der Termin liegt in der Vergangenheit.";
  if (startDatum > horizon) {
    return `Buchungen sind maximal ${BUCHUNGS_HORIZONT_MONATE} Monate im Voraus möglich (bis ${isoToDeutsch(horizon)}).`;
  }
  return null;
}
