import { TZDate } from "@date-fns/tz";

export const BUILDING_TIME_ZONE = "Europe/Berlin";

export function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Ungültiges Datumsformat: ${value}`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function parseTime(value: string): { hours: number; minutes: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Ungültiges Zeitformat: ${value}`);
  }
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

/** Combines a YYYY-MM-DD date and HH:MM wall-clock time (Europe/Berlin, DST-aware) into a real instant. */
export function combineDateAndTime(date: string, time: string): Date {
  const { year, month, day } = parseIsoDate(date);
  const { hours, minutes } = parseTime(time);
  const tzDate = new TZDate(year, month - 1, day, hours, minutes, 0, BUILDING_TIME_ZONE);
  return new Date(tzDate.getTime());
}

export function addYearsToDateString(date: string, years: number): string {
  const { year, month, day } = parseIsoDate(date);
  const d = new Date(Date.UTC(year + years, month - 1, day));
  return d.toISOString().slice(0, 10);
}

export function minDateString(a: string, b: string): string {
  return a < b ? a : b;
}
