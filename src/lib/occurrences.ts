import { TZDate } from "@date-fns/tz";
import { TIMEZONE } from "@/lib/constants";

export type Interval = { start: Date; end: Date };

/** "2026-10-05" + "18:00" (Wandzeit Europe/Berlin) -> UTC-Instant. DST-fest. */
export function berlinInstant(dateISO: string, time: string): Date {
  const [y, m, d] = dateISO.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const tz = new TZDate(y, m - 1, d, hh, mm, 0, 0, TIMEZONE);
  return new Date(tz.getTime());
}

/** ISO-Wochentag (1=Mo..7=So) eines Datums-Strings — reine Kalenderarithmetik, TZ-frei. */
export function isoWeekday(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0=So..6=Sa
  return day === 0 ? 7 : day;
}

/** Datums-String + n Tage (reine Kalenderarithmetik über UTC-Mittag, DST-frei). */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Prisma @db.Date (UTC-Mitternacht) -> "yyyy-mm-dd". */
export function dbDateToISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Heutiges Datum als "yyyy-mm-dd" in Europe/Berlin. */
export function todayISO(now: Date = new Date()): string {
  const tz = new TZDate(now.getTime(), TIMEZONE);
  const y = tz.getFullYear();
  const m = String(tz.getMonth() + 1).padStart(2, "0");
  const d = String(tz.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type WeeklyDef = {
  weekday: number; // ISO 1..7
  startTime: string; // "HH:mm" Wandzeit Europe/Berlin
  endTime: string;
  firstDate: string; // "yyyy-mm-dd"
  endDate?: string | null;
  intervalWeeks?: number; // Rhythmus in Wochen (Default 1 = jede Woche)
};

/**
 * Expandiert eine wöchentliche Serie zu konkreten UTC-Intervallen.
 * `fromISO`/`untilISO` begrenzen den erzeugten Bereich (beide inklusiv, Datumsebene).
 * Der Rhythmus bleibt dabei phasengenau am ersten Termin verankert.
 */
export function expandWeekly(def: WeeklyDef, untilISO: string, fromISO?: string): Interval[] {
  const result: Interval[] = [];
  const stepDays = Math.max(1, Math.trunc(def.intervalWeeks ?? 1)) * 7;

  let cursor = def.firstDate;
  const offset = (def.weekday - isoWeekday(cursor) + 7) % 7;
  cursor = addDaysISO(cursor, offset);

  if (fromISO && cursor < fromISO) {
    // In ganzen Rhythmus-Schritten bis zur unteren Grenze springen
    const [fy, fm, fd] = fromISO.split("-").map(Number);
    const [cy, cm, cd] = cursor.split("-").map(Number);
    const diffDays = Math.round(
      (Date.UTC(fy, fm - 1, fd) - Date.UTC(cy, cm - 1, cd)) / 86_400_000
    );
    cursor = addDaysISO(cursor, Math.floor(diffDays / stepDays) * stepDays);
    while (cursor < fromISO) cursor = addDaysISO(cursor, stepDays);
  }

  const hardEnd = def.endDate && def.endDate < untilISO ? def.endDate : untilISO;

  while (cursor <= hardEnd) {
    result.push({
      start: berlinInstant(cursor, def.startTime),
      end: berlinInstant(cursor, def.endTime),
    });
    cursor = addDaysISO(cursor, stepDays);
  }

  return result;
}
