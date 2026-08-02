import { format, isSameDay } from "date-fns";
import { de } from "date-fns/locale/de";
import { TZDate } from "@date-fns/tz";
import { BUILDING_TIME_ZONE } from "@/lib/series/expand";

function toBerlin(date: Date): TZDate {
  return new TZDate(date, BUILDING_TIME_ZONE);
}

export function formatDateTimeRange(startAt: Date, endAt: Date): string {
  const start = toBerlin(startAt);
  const end = toBerlin(endAt);

  if (isSameDay(start, end)) {
    return `${format(start, "EEEE, d. MMMM yyyy", { locale: de })}, ${format(start, "HH:mm")}–${format(end, "HH:mm")} Uhr`;
  }

  return `${format(start, "d. MMM yyyy HH:mm", { locale: de })} – ${format(end, "d. MMM yyyy HH:mm", { locale: de })} Uhr`;
}

export function formatDate(date: Date): string {
  return format(toBerlin(date), "d. MMMM yyyy", { locale: de });
}

export function formatDateShort(date: Date): string {
  return format(toBerlin(date), "dd.MM.yyyy", { locale: de });
}

export function formatTime(date: Date): string {
  return format(toBerlin(date), "HH:mm");
}

export function formatDateTime(date: Date): string {
  return format(toBerlin(date), "d. MMM yyyy, HH:mm", { locale: de });
}
