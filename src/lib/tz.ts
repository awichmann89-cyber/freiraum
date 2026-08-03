import { TIMEZONE } from "@/lib/constants";

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: TIMEZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateShortFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("de-DE", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/** "Mo., 05.10.2026" */
export function formatDate(d: Date): string {
  return dateFmt.format(d);
}

/** "05.10.2026" */
export function formatDateShort(d: Date): string {
  return dateShortFmt.format(d);
}

/** "18:00" */
export function formatTime(d: Date): string {
  return timeFmt.format(d);
}

/** "Mo., 05.10.2026, 18:00–20:00 Uhr" (bzw. mit Enddatum bei Tagesübergriff) */
export function formatRange(start: Date, end: Date): string {
  const sameDay = dateShortFmt.format(start) === dateShortFmt.format(end);
  if (sameDay) {
    return `${formatDate(start)}, ${formatTime(start)}–${formatTime(end)} Uhr`;
  }
  return `${formatDate(start)}, ${formatTime(start)} Uhr – ${formatDate(end)}, ${formatTime(end)} Uhr`;
}

export const WEEKDAY_NAMES: Record<number, string> = {
  1: "Montag",
  2: "Dienstag",
  3: "Mittwoch",
  4: "Donnerstag",
  5: "Freitag",
  6: "Samstag",
  7: "Sonntag",
};

export const WEEKDAY_NAMES_SHORT: Record<number, string> = {
  1: "Mo",
  2: "Di",
  3: "Mi",
  4: "Do",
  5: "Fr",
  6: "Sa",
  7: "So",
};
