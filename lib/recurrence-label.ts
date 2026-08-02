import { format } from "date-fns";
import { de } from "date-fns/locale/de";
import { RRule, rrulestr } from "rrule";
import type { RecurrenceInput, WeekdayCode } from "@/lib/series/expand";

const WEEKDAY_LABELS: Record<WeekdayCode, string> = {
  MO: "Montag",
  TU: "Dienstag",
  WE: "Mittwoch",
  TH: "Donnerstag",
  FR: "Freitag",
  SA: "Samstag",
  SU: "Sonntag",
};

const FREQUENCY_LABELS: Record<RecurrenceInput["frequency"], { singular: string; plural: string }> = {
  DAILY: { singular: "Tag", plural: "Tage" },
  WEEKLY: { singular: "Woche", plural: "Wochen" },
  MONTHLY: { singular: "Monat", plural: "Monate" },
};

function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return format(new Date(Date.UTC(year, month - 1, day)), "d. MMMM yyyy", { locale: de });
}

/** Human-readable German description of a recurrence pattern, e.g. for emails and admin review. */
export function describeRecurrence(
  recurrence: RecurrenceInput,
  seriesStartDate: string,
  startTime: string,
  endTime: string
): string {
  const parts: string[] = [];

  if (recurrence.frequency === "WEEKLY" && recurrence.byWeekday && recurrence.byWeekday.length > 0) {
    const days = recurrence.byWeekday.map((day) => WEEKDAY_LABELS[day]).join(", ");
    parts.push(
      recurrence.interval === 1 ? `Wöchentlich (${days})` : `Alle ${recurrence.interval} Wochen (${days})`
    );
  } else {
    const { singular, plural } = FREQUENCY_LABELS[recurrence.frequency];
    parts.push(recurrence.interval === 1 ? `Jeden ${singular}` : `Alle ${recurrence.interval} ${plural}`);
  }

  parts.push(`${startTime}–${endTime} Uhr`);
  parts.push(`ab ${formatIsoDate(seriesStartDate)}`);

  if (recurrence.endType === "on_date" && recurrence.endDate) {
    parts.push(`bis ${formatIsoDate(recurrence.endDate)}`);
  } else if (recurrence.endType === "after_count" && recurrence.count) {
    parts.push(`${recurrence.count} Termine`);
  }

  return parts.join(", ");
}

const FREQ_FROM_RRULE: Record<number, RecurrenceInput["frequency"]> = {
  [RRule.DAILY]: "DAILY",
  [RRule.WEEKLY]: "WEEKLY",
  [RRule.MONTHLY]: "MONTHLY",
};

const WEEKDAY_FROM_RRULE_INDEX: WeekdayCode[] = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

/** Reconstructs a RecurrenceInput from a stored RRULE string (no DTSTART needed for this purpose). */
export function parseStoredRRule(rruleText: string, seriesEndDate: string): RecurrenceInput {
  const rule = rrulestr(rruleText);
  const options = rule.options;

  const frequency = FREQ_FROM_RRULE[options.freq] ?? "WEEKLY";
  const byWeekday =
    options.byweekday && options.byweekday.length > 0
      ? options.byweekday.map((day: number) => WEEKDAY_FROM_RRULE_INDEX[day])
      : undefined;

  if (options.count) {
    return { frequency, interval: options.interval, byWeekday, endType: "after_count", count: options.count };
  }

  const untilDate = options.until ?? new Date(seriesEndDate);
  const endDate = untilDate.toISOString().slice(0, 10);
  return { frequency, interval: options.interval, byWeekday, endType: "on_date", endDate };
}

/** Human-readable description built directly from a stored series row's rrule text. */
export function describeStoredRRule(
  rruleText: string,
  seriesStartDate: string,
  seriesEndDate: string,
  startTime: string,
  endTime: string
): string {
  const recurrence = parseStoredRRule(rruleText, seriesEndDate);
  return describeRecurrence(recurrence, seriesStartDate, startTime, endTime);
}
