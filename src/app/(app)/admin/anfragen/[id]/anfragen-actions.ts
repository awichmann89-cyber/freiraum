"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { checkAvailability } from "@/lib/availability";
import { horizonISO, postenBeschreibungFromDb, postenIntervalsFromDb } from "@/lib/posten-utils";
import { sendEmail } from "@/lib/email";
import { anfrageErgebnisEmail, type ErgebnisZeile } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/base-url";

export type DecideResult =
  | { ok: true }
  | { error: string }
  | { needsForce: true; message: string };

class NeedsForceError extends Error {}
class BlockedError extends Error {}

export async function decidePosten(
  postenId: string,
  input: { decision: "BESTAETIGEN" | "ABLEHNEN"; force?: boolean; rejectReason?: string }
): Promise<DecideResult> {
  const admin = await requireAdmin();

  const posten = await prisma.anfragePosten.findUnique({
    where: { id: postenId },
    include: { anfrage: true },
  });
  if (!posten) return { error: "Posten nicht gefunden." };
  if (posten.status !== "ANGEFRAGT") return { error: "Dieser Termin wurde bereits entschieden." };

  if (input.decision === "ABLEHNEN") {
    await prisma.anfragePosten.update({
      where: { id: postenId, status: "ANGEFRAGT" },
      data: {
        status: "ABGELEHNT",
        rejectReason: input.rejectReason?.trim() || null,
        decidedById: admin.id,
        decidedAt: new Date(),
      },
    });
  } else {
    const horizon = horizonISO();
    const intervals = postenIntervalsFromDb(posten, horizon);
    if (intervals.length === 0) {
      return { error: "Im Serienzeitraum entsteht kein einziger Termin — bitte ablehnen." };
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Re-Check innerhalb der Transaktion: Zustand kann sich seit der Anfrage geändert haben.
        const results = await checkAvailability(posten.raumId, intervals, { db: tx });
        const konflikte = results.filter((r) => r.level !== "FREI");
        const hartGeblockt = results.some((r) =>
          r.konflikte.some((k) => k.art === "VERMIETUNG")
        );
        if (hartGeblockt) {
          throw new BlockedError(
            "Mindestens ein Termin kollidiert mit einer bestätigten Vermietung — Bestätigung nicht möglich."
          );
        }
        if (konflikte.length > 0 && !input.force) {
          throw new NeedsForceError(
            `${konflikte.length} von ${results.length} Termin${results.length === 1 ? "" : "en"} kollidiert mit bestehenden Gruppenbuchungen.`
          );
        }

        if (posten.art === "EINZEL") {
          await tx.buchung.create({
            data: {
              raumId: posten.raumId,
              art: "GRUPPE",
              startsAt: posten.startsAt!,
              endsAt: posten.endsAt!,
              titel: posten.titel,
              gruppeId: posten.anfrage.gruppeId,
              anfragePostenId: posten.id,
            },
          });
          await tx.anfragePosten.update({
            where: { id: postenId },
            data: { status: "BESTAETIGT", decidedById: admin.id, decidedAt: new Date() },
          });
        } else {
          const serie = await tx.buchungsSerie.create({
            data: {
              raumId: posten.raumId,
              gruppeId: posten.anfrage.gruppeId,
              titel: posten.titel,
              weekday: posten.weekday!,
              startTime: posten.startTime!,
              endTime: posten.endTime!,
              firstDate: posten.firstDate!,
              endDate: posten.endDate,
              materializedUntil: new Date(`${horizon}T00:00:00.000Z`),
            },
          });
          await tx.buchung.createMany({
            data: intervals.map((iv) => ({
              raumId: posten.raumId,
              art: "GRUPPE" as const,
              startsAt: iv.start,
              endsAt: iv.end,
              titel: posten.titel,
              gruppeId: posten.anfrage.gruppeId,
              serieId: serie.id,
              anfragePostenId: posten.id,
            })),
          });
          await tx.anfragePosten.update({
            where: { id: postenId },
            data: {
              status: "BESTAETIGT",
              decidedById: admin.id,
              decidedAt: new Date(),
              serieId: serie.id,
            },
          });
        }
      });
    } catch (e) {
      if (e instanceof NeedsForceError) return { needsForce: true, message: e.message };
      if (e instanceof BlockedError) return { error: e.message };
      throw e;
    }
  }

  await finalizeAnfrageIfComplete(posten.anfrageId);
  revalidatePath(`/admin/anfragen/${posten.anfrageId}`);
  revalidatePath("/admin/anfragen");
  return { ok: true };
}

/** Letzter Posten entschieden? Dann completedAt setzen (transaktionales Gate) und genau eine Ergebnis-Mail senden. */
async function finalizeAnfrageIfComplete(anfrageId: string) {
  const remaining = await prisma.anfragePosten.count({
    where: { anfrageId, status: "ANGEFRAGT" },
  });
  if (remaining > 0) return;

  const gated = await prisma.buchungsAnfrage.updateMany({
    where: { id: anfrageId, completedAt: null },
    data: { completedAt: new Date() },
  });
  if (gated.count === 0) return; // Mail wurde bereits verschickt

  const anfrage = await prisma.buchungsAnfrage.findUnique({
    where: { id: anfrageId },
    include: {
      createdBy: { select: { email: true } },
      posten: { include: { raum: { select: { name: true } } } },
    },
  });
  if (!anfrage) return;

  const zeilen: ErgebnisZeile[] = anfrage.posten.map((p) => ({
    titel: p.titel,
    raumName: p.raum.name,
    beschreibung: postenBeschreibungFromDb(p),
    status: p.status === "BESTAETIGT" ? "BESTAETIGT" : "ABGELEHNT",
    rejectReason: p.rejectReason,
  }));

  const mail = anfrageErgebnisEmail({
    posten: zeilen,
    link: `${getBaseUrl()}/meine-anfragen/${anfrageId}`,
  });
  await sendEmail({ to: anfrage.createdBy.email, ...mail });
}
