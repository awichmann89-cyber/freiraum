"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { anfragePostenSchema, buchungsAnfrageSchema } from "@/lib/zod-schemas";
import { zodErrorMessage } from "@/lib/action-result";
import { checkAvailability, type BelegungsLevel } from "@/lib/availability";
import { berlinInstant } from "@/lib/occurrences";
import {
  horizonISO,
  postenBeschreibung,
  postenIntervals,
  validatePostenDates,
} from "@/lib/posten-utils";
import { formatDateShort, formatRange } from "@/lib/tz";
import { sendEmail } from "@/lib/email";
import { neueAnfrageEmail, type PostenZeile } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/base-url";

export type AvailabilityFeedback =
  | { error: string }
  | {
      ok: true;
      level: BelegungsLevel;
      summary: string;
      details: string[];
    };

const LEVEL_RANK: Record<BelegungsLevel, number> = {
  FREI: 0,
  TEILWEISE_BELEGT: 1,
  VOLL_BELEGT: 2,
};

/** Live-Feedback im Wizard: Ist der Raum im gewünschten Zeitraum (teilweise) belegt? */
export async function checkPostenAvailability(input: unknown): Promise<AvailabilityFeedback> {
  await requireUser();

  const parsed = anfragePostenSchema.safeParse(input);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };
  const dateError = validatePostenDates(parsed.data);
  if (dateError) return { error: dateError };

  const horizon = horizonISO();
  const intervals = postenIntervals(parsed.data, horizon);
  if (intervals.length === 0) {
    return { error: "Im gewählten Zeitraum entsteht kein Termin — bitte Daten prüfen." };
  }

  const results = await checkAvailability(parsed.data.raumId, intervals);
  const worst = results.reduce<BelegungsLevel>(
    (acc, r) => (LEVEL_RANK[r.level] > LEVEL_RANK[acc] ? r.level : acc),
    "FREI"
  );
  const belegte = results.filter((r) => r.level !== "FREI");

  let summary: string;
  if (parsed.data.art === "EINZEL") {
    summary =
      worst === "FREI"
        ? "Der Raum ist frei."
        : worst === "TEILWEISE_BELEGT"
          ? "Der Raum ist im gewünschten Zeitraum teilweise belegt."
          : "Der Raum ist im gewünschten Zeitraum bereits voll belegt.";
  } else {
    summary =
      belegte.length === 0
        ? `Alle ${results.length} Termine sind frei (geprüft bis ${formatDateShort(new Date(`${horizon}T12:00:00`))}).`
        : `${belegte.length} von ${results.length} Terminen kollidieren mit bestehenden Buchungen (geprüft bis ${formatDateShort(new Date(`${horizon}T12:00:00`))}).`;
  }

  const details = belegte
    .slice(0, 5)
    .flatMap((r) =>
      r.konflikte
        .slice(0, 2)
        .map(
          (k) =>
            `${formatRange(k.start, k.end)} – ${k.titel}${k.gruppeName ? ` (${k.gruppeName})` : ""}`
        )
    );

  return { ok: true, level: worst, summary, details };
}

/** Sammel-Anfrage absenden: legt Batch + Posten an und informiert die Admins. */
export async function submitAnfrage(input: unknown): Promise<{ error: string } | never> {
  const user = await requireUser();
  if (!user.gruppeId) {
    return { error: "Nur Gruppen-Zugänge können Buchungsanfragen stellen." };
  }

  const parsed = buchungsAnfrageSchema.safeParse(input);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  for (const p of parsed.data.posten) {
    const dateError = validatePostenDates(p);
    if (dateError) return { error: `„${p.titel}": ${dateError}` };
  }

  // Raum-Existenz prüfen
  const raumIds = [...new Set(parsed.data.posten.map((p) => p.raumId))];
  const raeume = await prisma.raum.findMany({
    where: { id: { in: raumIds }, isActive: true },
    select: { id: true, name: true },
  });
  if (raeume.length !== raumIds.length) {
    return { error: "Mindestens ein gewählter Raum existiert nicht oder ist deaktiviert." };
  }
  const raumName = new Map(raeume.map((r) => [r.id, r.name]));

  // Konflikt-Level für die Admin-Mail berechnen
  const zeilen: PostenZeile[] = [];
  for (const p of parsed.data.posten) {
    const results = await checkAvailability(p.raumId, postenIntervals(p));
    const worst = results.reduce(
      (acc, r) => (LEVEL_RANK[r.level] > LEVEL_RANK[acc] ? r.level : acc),
      "FREI" as BelegungsLevel
    );
    zeilen.push({
      titel: p.titel,
      raumName: raumName.get(p.raumId) ?? "?",
      beschreibung: postenBeschreibung(p),
      konflikt: worst,
    });
  }

  const anfrage = await prisma.buchungsAnfrage.create({
    data: {
      gruppeId: user.gruppeId,
      createdById: user.id,
      notiz: parsed.data.notiz,
      posten: {
        create: parsed.data.posten.map((p) =>
          p.art === "EINZEL"
            ? {
                raumId: p.raumId,
                titel: p.titel,
                art: "EINZEL" as const,
                startsAt: berlinInstant(p.date, p.startTime),
                endsAt: berlinInstant(p.date, p.endTime),
              }
            : {
                raumId: p.raumId,
                titel: p.titel,
                art: "WOECHENTLICH" as const,
                weekday: p.weekday,
                startTime: p.startTime,
                endTime: p.endTime,
                firstDate: new Date(`${p.firstDate}T00:00:00.000Z`),
                endDate: p.endDate ? new Date(`${p.endDate}T00:00:00.000Z`) : null,
              }
        ),
      },
    },
    include: { gruppe: { select: { name: true } } },
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { email: true },
  });
  if (admins.length > 0) {
    const mail = neueAnfrageEmail({
      gruppeName: anfrage.gruppe.name,
      erstellerName: user.name ?? "",
      posten: zeilen,
      link: `${getBaseUrl()}/admin/anfragen/${anfrage.id}`,
    });
    await sendEmail({ to: admins.map((a) => a.email), ...mail });
  }

  redirect(`/meine-anfragen/${anfrage.id}?neu=1`);
}
