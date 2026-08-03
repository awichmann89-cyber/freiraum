"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth-helpers";
import { adminBuchungSchema, type AnfragePostenInput } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";
import { checkAvailability } from "@/lib/availability";
import { horizonISO, postenIntervals, validatePostenDates } from "@/lib/posten-utils";
import { formatRange } from "@/lib/tz";

export type AdminBuchungResult = { ok: true } | { error: string; gruppenKonflikt?: boolean };

/**
 * Admin-Direktbuchung aus dem Kalender: legt sofort BESTAETIGTe Gruppen-Buchungen an —
 * einmalig oder als Serie mit frei wählbarem Wochen-Rhythmus.
 * Vermietungen blocken hart; Kollisionen mit Gruppenterminen nur mit `force` überstimmbar.
 */
export async function createAdminBuchung(input: unknown): Promise<AdminBuchungResult> {
  await requireAdmin();

  const parsed = adminBuchungSchema.safeParse(input);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };
  const data = parsed.data;

  const posten: AnfragePostenInput =
    data.art === "EINZEL"
      ? {
          art: "EINZEL",
          raumId: data.raumId,
          titel: data.titel,
          startDate: data.startDate,
          endDate: data.endDate,
          startTime: data.startTime,
          endTime: data.endTime,
        }
      : {
          art: "WOECHENTLICH",
          raumId: data.raumId,
          titel: data.titel,
          weekday: data.weekday,
          firstDate: data.firstDate,
          endDate: data.endDate,
          intervalWeeks: data.intervalWeeks,
          startTime: data.startTime,
          endTime: data.endTime,
        };

  const dateError = validatePostenDates(posten);
  if (dateError) return { error: dateError };

  const horizon = horizonISO();
  const intervals = postenIntervals(posten, horizon);
  if (intervals.length === 0) {
    return { error: "Im gewählten Zeitraum entsteht kein Termin — bitte Eingaben prüfen." };
  }

  const [raum, gruppe] = await Promise.all([
    prisma.raum.findUnique({ where: { id: data.raumId, isActive: true }, select: { id: true } }),
    prisma.gruppe.findUnique({ where: { id: data.gruppeId, isActive: true }, select: { id: true } }),
  ]);
  if (!raum) return { error: "Der gewählte Raum existiert nicht oder ist deaktiviert." };
  if (!gruppe) return { error: "Die gewählte Gruppe existiert nicht oder ist deaktiviert." };

  // Re-Check in der Transaktion — Race mit parallelen Bestätigungen/Signaturen.
  const result = await prisma.$transaction(async (tx): Promise<AdminBuchungResult> => {
    const results = await checkAvailability(data.raumId, intervals, { db: tx });
    const alleKonflikte = results.flatMap((r) => r.konflikte);

    const vermietungen = alleKonflikte.filter((k) => k.art === "VERMIETUNG");
    if (vermietungen.length > 0) {
      return {
        error: `Kollidiert mit einer Vermietung (${formatRange(
          vermietungen[0].start,
          vermietungen[0].end
        )} – ${vermietungen[0].titel}). Vermietungen blocken verbindlich.`,
      };
    }

    const gruppenKonflikte = alleKonflikte.filter((k) => k.art === "GRUPPE");
    if (gruppenKonflikte.length > 0 && !data.force) {
      const liste = gruppenKonflikte
        .slice(0, 3)
        .map((k) => `${formatRange(k.start, k.end)} – ${k.titel}${k.gruppeName ? ` (${k.gruppeName})` : ""}`)
        .join("; ");
      return {
        error: `Kollidiert mit ${gruppenKonflikte.length} Gruppentermin${
          gruppenKonflikte.length === 1 ? "" : "en"
        }: ${liste}`,
        gruppenKonflikt: true,
      };
    }

    if (data.art === "EINZEL") {
      await tx.buchung.create({
        data: {
          raumId: data.raumId,
          art: "GRUPPE",
          status: "BESTAETIGT",
          startsAt: intervals[0].start,
          endsAt: intervals[0].end,
          titel: data.titel,
          gruppeId: data.gruppeId,
        },
      });
    } else {
      const serie = await tx.buchungsSerie.create({
        data: {
          raumId: data.raumId,
          gruppeId: data.gruppeId,
          titel: data.titel,
          weekday: data.weekday,
          startTime: data.startTime,
          endTime: data.endTime,
          firstDate: new Date(`${data.firstDate}T00:00:00.000Z`),
          endDate: data.endDate ? new Date(`${data.endDate}T00:00:00.000Z`) : null,
          intervalWeeks: data.intervalWeeks,
          materializedUntil: new Date(`${horizon}T00:00:00.000Z`),
        },
      });
      await tx.buchung.createMany({
        data: intervals.map((iv) => ({
          raumId: data.raumId,
          art: "GRUPPE" as const,
          status: "BESTAETIGT" as const,
          startsAt: iv.start,
          endsAt: iv.end,
          titel: data.titel,
          gruppeId: data.gruppeId,
          serieId: serie.id,
        })),
      });
    }
    return { ok: true };
  });

  if ("ok" in result) revalidatePath("/kalender");
  return result;
}

/**
 * Termin absagen — Gruppen ihre eigenen, Admins alle Gruppentermine.
 * `scope: "serie"` beendet die Serie und storniert alle zukünftigen Termine;
 * vergangene Termine bleiben als Historie erhalten.
 */
export async function cancelBuchung(
  buchungId: string,
  scope: "einzel" | "serie"
): Promise<ActionResult> {
  const user = await requireUser();

  const buchung = await prisma.buchung.findUnique({
    where: { id: buchungId },
    select: { id: true, art: true, status: true, gruppeId: true, serieId: true },
  });
  if (!buchung) return { error: "Termin nicht gefunden." };
  if (buchung.art !== "GRUPPE") {
    return { error: "Vermietungen werden über die Vermietungsseite storniert." };
  }
  if (buchung.status !== "BESTAETIGT") return { error: "Der Termin ist bereits abgesagt." };

  const istAdmin = user.role === "ADMIN";
  if (!istAdmin && (!user.gruppeId || buchung.gruppeId !== user.gruppeId)) {
    return { error: "Du kannst nur Termine deiner eigenen Gruppe absagen." };
  }

  const reason = istAdmin ? "Vom Admin abgesagt" : "Von der Gruppe abgesagt";

  if (scope === "serie" && buchung.serieId) {
    await prisma.$transaction([
      prisma.buchungsSerie.update({
        where: { id: buchung.serieId },
        data: { status: "STORNIERT" },
      }),
      prisma.buchung.updateMany({
        where: { serieId: buchung.serieId, status: "BESTAETIGT", startsAt: { gte: new Date() } },
        data: { status: "STORNIERT", cancelledAt: new Date(), cancelReason: reason },
      }),
    ]);
  } else {
    await prisma.buchung.update({
      where: { id: buchungId },
      data: { status: "STORNIERT", cancelledAt: new Date(), cancelReason: reason },
    });
  }

  revalidatePath("/kalender");
  return { ok: true };
}
