import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein gültiges Datum wählen.");

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Bitte eine gültige Uhrzeit (HH:MM) angeben.");

export const contactFieldsSchema = z.object({
  requesterName: z
    .string()
    .trim()
    .min(2, "Bitte Namen angeben.")
    .max(200),
  requesterEmail: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
  requesterPhone: z.string().trim().max(50).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const weekdaySchema = z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);

export const recurrenceSchema = z
  .object({
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    interval: z.number().int().min(1).max(52),
    byWeekday: z.array(weekdaySchema).optional(),
    endType: z.enum(["on_date", "after_count"]),
    endDate: dateString.optional(),
    count: z.number().int().min(1).max(200).optional(),
  })
  .refine((data) => data.frequency !== "WEEKLY" || (data.byWeekday && data.byWeekday.length > 0), {
    message: "Bitte mindestens einen Wochentag auswählen.",
    path: ["byWeekday"],
  })
  .refine((data) => data.endType !== "on_date" || !!data.endDate, {
    message: "Bitte ein Enddatum angeben.",
    path: ["endDate"],
  })
  .refine((data) => data.endType !== "after_count" || !!data.count, {
    message: "Bitte die Anzahl der Termine angeben.",
    path: ["count"],
  });

export const roomIdsSchema = z
  .array(z.uuid())
  .min(1, "Bitte mindestens einen Raum auswählen.");

// Base object shapes (kept refinement-free so they stay omit()/extend()-able for the group variants below).
const singleBookingObjectSchema = contactFieldsSchema.extend({
  roomIds: roomIdsSchema,
  date: dateString,
  startTime: timeString,
  endTime: timeString,
});

const seriesBookingObjectSchema = contactFieldsSchema.extend({
  roomIds: roomIdsSchema,
  startTime: timeString,
  endTime: timeString,
  seriesStartDate: dateString,
  recurrence: recurrenceSchema,
});

const timeOrderRefinement = (data: { startTime: string; endTime: string }) =>
  data.startTime < data.endTime;
const timeOrderRefinementOptions = {
  message: "Die Endzeit muss nach der Startzeit liegen.",
  path: ["endTime"],
};

export const singleBookingSchema = singleBookingObjectSchema.refine(
  timeOrderRefinement,
  timeOrderRefinementOptions
);

export const seriesBookingSchema = seriesBookingObjectSchema.refine(
  timeOrderRefinement,
  timeOrderRefinementOptions
);

/** Same shape as the public form, minus contact fields (taken from the logged-in group's session instead). */
export const groupSingleBookingSchema = singleBookingObjectSchema
  .omit({ requesterName: true, requesterEmail: true, requesterPhone: true })
  .refine(timeOrderRefinement, timeOrderRefinementOptions);

export const groupSeriesBookingSchema = seriesBookingObjectSchema
  .omit({ requesterName: true, requesterEmail: true, requesterPhone: true })
  .refine(timeOrderRefinement, timeOrderRefinementOptions);

export type SingleBookingInput = z.infer<typeof singleBookingSchema>;
export type SeriesBookingInput = z.infer<typeof seriesBookingSchema>;
export type GroupSingleBookingInput = z.infer<typeof groupSingleBookingSchema>;
export type GroupSeriesBookingInput = z.infer<typeof groupSeriesBookingSchema>;
export type RecurrenceInputSchema = z.infer<typeof recurrenceSchema>;
