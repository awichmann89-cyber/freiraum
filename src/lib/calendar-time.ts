import { TZDate } from "@date-fns/tz";
import { TIMEZONE } from "@/lib/constants";
import { addDaysISO, berlinInstant, isoWeekday } from "@/lib/occurrences";

/** Minuten seit Mitternacht (Wandzeit Europe/Berlin) eines UTC-Instants. */
export function berlinMinutes(d: Date): number {
  const tz = new TZDate(d.getTime(), TIMEZONE);
  return tz.getHours() * 60 + tz.getMinutes();
}

/** Kalendertag (Europe/Berlin) eines UTC-Instants als "yyyy-mm-dd". */
export function berlinDateISO(d: Date): string {
  const tz = new TZDate(d.getTime(), TIMEZONE);
  const y = tz.getFullYear();
  const m = String(tz.getMonth() + 1).padStart(2, "0");
  const day = String(tz.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type DaySegment = { dateISO: string; startMin: number; endMin: number };

/**
 * Zerlegt ein UTC-Intervall in Segmente je Berliner Kalendertag —
 * mehrtägige Buchungen (Vermietungen) erscheinen so in jeder Tagesspalte.
 */
export function splitIntoBerlinDays(start: Date, end: Date): DaySegment[] {
  if (end.getTime() <= start.getTime()) return [];

  const segments: DaySegment[] = [];
  let dateISO = berlinDateISO(start);

  for (let i = 0; i < 370; i++) {
    const nextMidnight = berlinInstant(addDaysISO(dateISO, 1), "00:00");
    const segStartMin = i === 0 ? berlinMinutes(start) : 0;

    if (end.getTime() <= nextMidnight.getTime()) {
      const endMin = end.getTime() === nextMidnight.getTime() ? 1440 : berlinMinutes(end);
      if (endMin > segStartMin) segments.push({ dateISO, startMin: segStartMin, endMin });
      break;
    }

    segments.push({ dateISO, startMin: segStartMin, endMin: 1440 });
    dateISO = addDaysISO(dateISO, 1);
  }

  return segments;
}

/** Minuten seit Mitternacht -> "18:30". */
export function minToHHMM(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** Montag der Woche, in der das Datum liegt. */
export function startOfWeekISO(dateISO: string): string {
  return addDaysISO(dateISO, -(isoWeekday(dateISO) - 1));
}

/** Die 7 Kalendertage der Woche ab Montag. */
export function weekDaysISO(mondayISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysISO(mondayISO, i));
}
