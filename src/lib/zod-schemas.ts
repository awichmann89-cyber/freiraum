import { z } from "zod";

// ---------- Bausteine ----------

export const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit im Format HH:MM angeben");

export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format JJJJ-MM-TT angeben");

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Farbe als Hex-Wert angeben");

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ---------- Stammdaten (Admin) ----------

export const etageSchema = z.object({
  name: z.string().trim().min(1, "Name angeben").max(50),
  level: z.coerce.number().int().min(-5).max(20),
});

export const raumSchema = z.object({
  name: z.string().trim().min(1, "Name angeben").max(80),
  etageId: z.string().min(1, "Etage wählen"),
  sizeSqm: z.coerce.number().positive().max(9999).optional().or(z.literal("").transform(() => undefined)),
  capacity: z.coerce.number().int().positive().max(9999).optional().or(z.literal("").transform(() => undefined)),
  priceHourly: z.coerce.number().min(0).max(99999).optional().or(z.literal("").transform(() => undefined)),
  priceDaily: z.coerce.number().min(0).max(99999).optional().or(z.literal("").transform(() => undefined)),
});

export const gruppeSchema = z.object({
  name: z.string().trim().min(1, "Name angeben").max(80),
  color: hexColor,
  notiz: z.string().trim().max(500).optional(),
});

export const userInviteSchema = z.object({
  email: z.email("Gültige E-Mail angeben").transform((v) => v.toLowerCase().trim()),
  name: z.string().trim().min(1, "Name angeben").max(100),
  gruppeId: z.string().min(1, "Gruppe wählen"),
});

export const passwordSchema = z
  .object({
    password: z.string().min(8, "Mindestens 8 Zeichen"),
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["passwordConfirm"],
  });

// ---------- Interne Buchungsanfragen ----------

const postenBase = {
  raumId: z.string().min(1, "Raum wählen"),
  titel: z.string().trim().min(1, "Titel angeben").max(120),
  startTime: timeString,
  endTime: timeString,
};

export const einzelPostenSchema = z
  .object({
    art: z.literal("EINZEL"),
    startDate: dateString,
    endDate: dateString,
    ...postenBase,
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Enddatum muss am oder nach dem Startdatum liegen",
    path: ["endDate"],
  })
  .refine(
    (d) => d.endDate > d.startDate || timeToMinutes(d.endTime) > timeToMinutes(d.startTime),
    { message: "Ende muss nach dem Beginn liegen", path: ["endTime"] }
  );

export const wochenPostenSchema = z
  .object({
    art: z.literal("WOECHENTLICH"),
    weekday: z.coerce.number().int().min(1).max(7),
    firstDate: dateString,
    endDate: dateString.optional().or(z.literal("").transform(() => undefined)),
    ...postenBase,
  })
  .refine((d) => timeToMinutes(d.endTime) > timeToMinutes(d.startTime), {
    message: "Ende muss nach dem Beginn liegen",
    path: ["endTime"],
  })
  .refine((d) => !d.endDate || d.endDate >= d.firstDate, {
    message: "Enddatum muss nach dem ersten Termin liegen",
    path: ["endDate"],
  });

export const anfragePostenSchema = z.discriminatedUnion("art", [
  einzelPostenSchema,
  wochenPostenSchema,
]);

export const buchungsAnfrageSchema = z.object({
  notiz: z.string().trim().max(1000).optional(),
  posten: z.array(anfragePostenSchema).min(1, "Mindestens einen Termin hinzufügen").max(50),
});

/** Admin-Direktbuchung aus dem Kalender: wird sofort als BESTAETIGT eingetragen. */
export const adminBuchungSchema = z
  .object({
    raumId: z.string().min(1, "Raum wählen"),
    gruppeId: z.string().min(1, "Gruppe wählen"),
    titel: z.string().trim().min(1, "Titel angeben").max(120),
    startDate: dateString,
    endDate: dateString,
    startTime: timeString,
    endTime: timeString,
    force: z.boolean().optional().default(false),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Enddatum muss am oder nach dem Startdatum liegen",
    path: ["endDate"],
  })
  .refine(
    (d) => d.endDate > d.startDate || timeToMinutes(d.endTime) > timeToMinutes(d.startTime),
    { message: "Ende muss nach dem Beginn liegen", path: ["endTime"] }
  );

export type AdminBuchungInput = z.input<typeof adminBuchungSchema>;

export type EinzelPostenInput = z.infer<typeof einzelPostenSchema>;
export type WochenPostenInput = z.infer<typeof wochenPostenSchema>;
export type AnfragePostenInput = z.infer<typeof anfragePostenSchema>;
export type BuchungsAnfrageInput = z.infer<typeof buchungsAnfrageSchema>;

// ---------- Floorplan ----------

const uploadUrl = z
  .string()
  .min(1)
  .refine((u) => u.startsWith("https://") || u.startsWith("/uploads/"), "Ungültige Upload-URL");

export const floorplanSaveSchema = z.object({
  pdfUrl: uploadUrl,
  imageUrl: uploadUrl,
  width: z.number().int().min(100).max(20000),
  height: z.number().int().min(100).max(20000),
});

export const raumFormSchema = z.object({
  raumId: z.string().min(1),
  kind: z.enum(["RECHTECK", "POLYGON"]),
  points: z
    .array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }))
    .min(3, "Form braucht mindestens 3 Punkte")
    .max(60),
});

export const raumFormenSchema = z.array(raumFormSchema).max(200);

export type FloorplanSaveInput = z.infer<typeof floorplanSaveSchema>;
export type RaumFormInput = z.infer<typeof raumFormSchema>;

// ---------- Vermietung / Vertrag ----------

export const vorlageSchema = z.object({
  name: z.string().trim().min(1, "Name angeben").max(80),
  body: z.string().trim().min(1, "Vertragstext angeben").max(50_000),
  isDefault: z.coerce.boolean().default(false),
});

export const vertragSendenSchema = z
  .object({
    raumId: z.string().min(1, "Raum wählen"),
    startDate: dateString,
    startTime: timeString,
    endDate: dateString,
    endTime: timeString,
    priceType: z.enum(["STUNDE", "TAG"]),
    basePrice: z.coerce.number().min(0).max(1_000_000),
    discountPercent: z.coerce.number().min(0).max(100).default(0),
    vorlageId: z.string().min(1, "Vorlage wählen"),
    adminNote: z.string().trim().max(1000).optional(),
  })
  .refine(
    (d) =>
      d.endDate > d.startDate ||
      (d.endDate === d.startDate && timeToMinutes(d.endTime) > timeToMinutes(d.startTime)),
    { message: "Ende muss nach dem Beginn liegen", path: ["endTime"] }
  );

export const signSchema = z.object({
  name: z.string().trim().min(2, "Bitte vollständigen Namen angeben").max(120),
  agb: z.literal(true, "Bitte den Vertrag bestätigen"),
  signatureDataUrl: z
    .string()
    .startsWith("data:image/png;base64,", "Unterschrift fehlt")
    .max(700_000, "Unterschrift zu groß"),
});

export type VorlageInput = z.infer<typeof vorlageSchema>;
export type VertragSendenInput = z.infer<typeof vertragSendenSchema>;

// ---------- Öffentliche Mietanfrage ----------

export const mietanfrageSchema = z
  .object({
    contactName: z.string().trim().min(1, "Name angeben").max(100),
    contactEmail: z.email("Gültige E-Mail angeben").transform((v) => v.toLowerCase().trim()),
    contactPhone: z.string().trim().max(40).optional(),
    organization: z.string().trim().max(120).optional(),
    purpose: z.string().trim().min(1, "Zweck angeben").max(200),
    message: z.string().trim().max(2000).optional(),
    raumId: z.string().optional(),
    startDate: dateString,
    endDate: dateString,
    startTime: timeString,
    endTime: timeString,
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Enddatum muss am oder nach dem Startdatum liegen",
    path: ["endDate"],
  })
  .refine(
    (d) => d.endDate > d.startDate || timeToMinutes(d.endTime) > timeToMinutes(d.startTime),
    { message: "Ende muss nach dem Beginn liegen", path: ["endTime"] }
  );

export type MietanfrageInput = z.infer<typeof mietanfrageSchema>;
