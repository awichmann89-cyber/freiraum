import { RRule, rrulestr, Weekday } from "rrule";
import { TZDate } from "@date-fns/tz";
import { BUILDING_TIME_ZONE, parseIsoDate, parseTime } from "@/lib/datetime";

export { BUILDING_TIME_ZONE };

/** Hard ceiling on generated occurrences per series, regardless of UNTIL/COUNT, to avoid runaway generation. */
export const MAX_SERIES_OCCURRENCES = 200;

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";
export type WeekdayCode = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface RecurrenceInput {
  frequency: RecurrenceFrequency;
  interval: number;
  /** Only meaningful for WEEKLY frequency. */
  byWeekday?: WeekdayCode[];
  endType: "on_date" | "after_count";
  endDate?: string; // YYYY-MM-DD
  count?: number;
}

const FREQ_MAP: Record<RecurrenceFrequency, number> = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
};

const WEEKDAY_MAP: Record<WeekdayCode, InstanceType<typeof Weekday>> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

/**
 * Builds the RRULE portion (without DTSTART, since the series' start date is
 * kept separately in `booking_series.series_start_date`) for storage.
 */
export function buildRRuleString(input: RecurrenceInput): string {
  const options: ConstructorParameters<typeof RRule>[0] = {
    freq: FREQ_MAP[input.frequency],
    interval: input.interval,
  };

  if (input.frequency === "WEEKLY" && input.byWeekday && input.byWeekday.length > 0) {
    options.byweekday = input.byWeekday.map((day) => WEEKDAY_MAP[day]);
  }

  if (input.endType === "on_date" && input.endDate) {
    const { year, month, day } = parseIsoDate(input.endDate);
    options.until = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  } else if (input.endType === "after_count" && input.count) {
    options.count = Math.min(input.count, MAX_SERIES_OCCURRENCES);
  }

  const rule = new RRule(options);
  return rule.toString().replace(/^RRULE:/, "");
}

export interface ExpandOccurrencesParams {
  rruleText: string;
  seriesStartDate: string; // YYYY-MM-DD
  seriesEndDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  maxOccurrences?: number;
}

export interface SeriesOccurrence {
  startAt: Date;
  endAt: Date;
}

/**
 * Expands a stored RRULE into concrete occurrences.
 *
 * The RRULE itself is evaluated against a plain UTC calendar date (so BYDAY/
 * frequency math is unambiguous regardless of server timezone), then each
 * resulting calendar day is combined with the wall-clock start/end time in
 * Europe/Berlin (DST-aware) to produce the real booking instants.
 */
export function expandSeriesOccurrences(params: ExpandOccurrencesParams): SeriesOccurrence[] {
  const { year: startY, month: startM, day: startD } = parseIsoDate(params.seriesStartDate);
  const { year: endY, month: endM, day: endD } = parseIsoDate(params.seriesEndDate);
  const dtstart = new Date(Date.UTC(startY, startM - 1, startD));
  const boundEnd = new Date(Date.UTC(endY, endM - 1, endD, 23, 59, 59));

  if (boundEnd < dtstart) {
    throw new Error("Das Serienende darf nicht vor dem Serienstart liegen.");
  }

  const rule = rrulestr(params.rruleText, { dtstart });
  const occurrenceDates = rule.between(dtstart, boundEnd, true);

  const cap = Math.min(params.maxOccurrences ?? MAX_SERIES_OCCURRENCES, MAX_SERIES_OCCURRENCES);
  const capped = occurrenceDates.slice(0, cap);

  const { hours: startHours, minutes: startMinutes } = parseTime(params.startTime);
  const { hours: endHours, minutes: endMinutes } = parseTime(params.endTime);

  return capped.map((date) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();

    const startAt = new TZDate(year, month, day, startHours, startMinutes, 0, BUILDING_TIME_ZONE);
    const endAt = new TZDate(year, month, day, endHours, endMinutes, 0, BUILDING_TIME_ZONE);

    return { startAt: new Date(startAt.getTime()), endAt: new Date(endAt.getTime()) };
  });
}
