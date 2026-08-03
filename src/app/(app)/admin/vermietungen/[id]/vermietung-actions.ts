"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { vertragSendenSchema, dateString, timeString } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";
import { berlinInstant } from "@/lib/occurrences";
import { checkAvailability } from "@/lib/availability";
import { computeFinalPrice, formatEuro, renderContractTemplate } from "@/lib/contract";
import { getSetting } from "@/lib/settings";
import { createActionToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import {
  mietanfrageAbsageEmail,
  terminGeaendertEmail,
  vermietungStorniertEmail,
  vertragEmail,
} from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/base-url";
import { formatRange } from "@/lib/tz";
import { z } from "zod";

function revalidateVermietung(id: string) {
  revalidatePath(`/admin/vermietungen/${id}`);
  revalidatePath("/admin/vermietungen");
}

/**
 * NEU/ABGELAUFEN/VERTRAG_GESENDET -> VERTRAG_GESENDET:
 * Konditionen festlegen, Vertragstext einfrieren, Token erzeugen, Mail 7 senden.
 * Erneutes Senden invalidiert alte Tokens und friert den Text neu ein.
 */
export async function sendVertrag(vermietungId: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = vertragSendenSchema.safeParse(input);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };
  const data = parsed.data;

  const vermietung = await prisma.vermietung.findUnique({ where: { id: vermietungId } });
  if (!vermietung) return { error: "Vermietung nicht gefunden." };
  if (!["NEU", "ABGELAUFEN", "VERTRAG_GESENDET"].includes(vermietung.status)) {
    return { error: `Im Status „${vermietung.status}" kann kein Vertrag versendet werden.` };
  }

  const raum = await prisma.raum.findUnique({
    where: { id: data.raumId, isActive: true },
    include: { etage: { select: { name: true } } },
  });
  if (!raum) return { error: "Der gewählte Raum existiert nicht oder ist deaktiviert." };

  const vorlage = await prisma.vertragsvorlage.findUnique({ where: { id: data.vorlageId } });
  if (!vorlage) return { error: "Vertragsvorlage nicht gefunden." };

  const startsAt = berlinInstant(data.startDate, data.startTime);
  const endsAt = berlinInstant(data.endDate, data.endTime);
  const finalPrice = computeFinalPrice(data.basePrice, data.discountPercent);

  // Harte Kollision mit anderer Vermietung blockiert; Gruppenbuchungen nicht (Anzeige in UI).
  const [check] = await checkAvailability(raum.id, [{ start: startsAt, end: endsAt }], {
    arten: ["VERMIETUNG"],
  });
  if (check && check.konflikte.length > 0) {
    return { error: "Der Zeitraum kollidiert mit einer anderen bestätigten Vermietung." };
  }

  const contractText = renderContractTemplate(vorlage.body, {
    nummer: vermietung.nummer,
    hausName: await getSetting("hausName"),
    contactName: vermietung.contactName,
    organization: vermietung.organization,
    contactEmail: vermietung.contactEmail,
    contactPhone: vermietung.contactPhone,
    purpose: vermietung.purpose,
    raumName: raum.name,
    etageName: raum.etage.name,
    start: startsAt,
    end: endsAt,
    priceType: data.priceType,
    basePrice: data.basePrice,
    discountPercent: data.discountPercent,
    finalPrice,
  });

  const tokenDays = parseInt(await getSetting("contractTokenDays"), 10) || 30;

  await prisma.vermietung.update({
    where: { id: vermietungId },
    data: {
      status: "VERTRAG_GESENDET",
      raumId: raum.id,
      startsAt,
      endsAt,
      priceType: data.priceType,
      basePrice: data.basePrice,
      discountPercent: data.discountPercent,
      finalPrice,
      vorlageId: vorlage.id,
      contractText,
      sentAt: new Date(),
      adminNote: data.adminNote ?? vermietung.adminNote,
      declineReason: null,
    },
  });

  // Alte Tokens werden in createActionToken invalidiert (deleteMany gleicher Zweck+Vermietung)
  const rawToken = await createActionToken({
    purpose: "VERTRAG_SIGNATUR",
    vermietungId,
    ttlHours: tokenDays * 24,
  });

  await sendEmail({
    to: vermietung.contactEmail,
    ...vertragEmail({
      contactName: vermietung.contactName,
      nummer: vermietung.nummer,
      raumName: raum.name,
      start: startsAt,
      end: endsAt,
      preis: formatEuro(finalPrice),
      link: `${getBaseUrl()}/vertrag/${rawToken}`,
      gueltigTage: tokenDays,
    }),
  });

  revalidateVermietung(vermietungId);
  return { ok: true };
}

/** NEU/VERTRAG_GESENDET/ABGELAUFEN -> ABGELEHNT (+ optionale Absage-Mail). */
export async function declineVermietung(
  vermietungId: string,
  opts: { grund?: string; mailSenden: boolean }
): Promise<ActionResult> {
  await requireAdmin();

  const vermietung = await prisma.vermietung.findUnique({ where: { id: vermietungId } });
  if (!vermietung) return { error: "Vermietung nicht gefunden." };
  if (!["NEU", "VERTRAG_GESENDET", "ABGELAUFEN"].includes(vermietung.status)) {
    return { error: "In diesem Status kann nicht mehr abgelehnt werden." };
  }

  await prisma.$transaction([
    prisma.vermietung.update({
      where: { id: vermietungId },
      data: { status: "ABGELEHNT", declineReason: opts.grund?.trim() || null },
    }),
    prisma.actionToken.deleteMany({ where: { vermietungId, purpose: "VERTRAG_SIGNATUR" } }),
  ]);

  if (opts.mailSenden) {
    await sendEmail({
      to: vermietung.contactEmail,
      ...mietanfrageAbsageEmail({
        contactName: vermietung.contactName,
        nummer: vermietung.nummer,
        grund: opts.grund,
      }),
    });
  }

  revalidateVermietung(vermietungId);
  return { ok: true };
}

/** SIGNIERT -> STORNIERT: Buchungen stornieren, Mieter:in informieren. */
export async function stornoVermietung(vermietungId: string): Promise<ActionResult> {
  await requireAdmin();

  const vermietung = await prisma.vermietung.findUnique({
    where: { id: vermietungId },
    include: { raum: { select: { name: true } } },
  });
  if (!vermietung) return { error: "Vermietung nicht gefunden." };
  if (vermietung.status !== "SIGNIERT") {
    return { error: "Nur signierte Vermietungen können storniert werden." };
  }

  await prisma.$transaction([
    prisma.vermietung.update({
      where: { id: vermietungId },
      data: { status: "STORNIERT", cancelledAt: new Date() },
    }),
    prisma.buchung.updateMany({
      where: { vermietungId, status: "BESTAETIGT" },
      data: { status: "STORNIERT", cancelledAt: new Date(), cancelReason: "Vermietung storniert" },
    }),
  ]);

  if (vermietung.startsAt && vermietung.endsAt && vermietung.raum) {
    await sendEmail({
      to: vermietung.contactEmail,
      ...vermietungStorniertEmail({
        contactName: vermietung.contactName,
        nummer: vermietung.nummer,
        raumName: vermietung.raum.name,
        start: vermietung.startsAt,
        end: vermietung.endsAt,
      }),
    });
  }

  revalidateVermietung(vermietungId);
  return { ok: true };
}

// ---------- Konfliktauflösung: kollidierende Gruppenbuchungen ----------

async function notifyGruppe(
  gruppeId: string,
  mail: { subject: string; html: string }
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { gruppeId, isActive: true, passwordHash: { not: null } },
    select: { email: true },
  });
  if (users.length > 0) {
    await sendEmail({ to: users.map((u) => u.email), ...mail });
  }
}

/** Kollidierende Gruppenbuchung absagen + Gruppe per Mail informieren (Mail 9). */
export async function cancelGruppenBuchung(
  buchungId: string,
  grund: string
): Promise<ActionResult> {
  await requireAdmin();

  const buchung = await prisma.buchung.findUnique({
    where: { id: buchungId },
    include: { raum: { select: { name: true } }, gruppe: { select: { id: true, name: true } } },
  });
  if (!buchung || buchung.art !== "GRUPPE") return { error: "Buchung nicht gefunden." };
  if (buchung.status !== "BESTAETIGT") return { error: "Buchung ist bereits storniert." };

  await prisma.buchung.update({
    where: { id: buchungId },
    data: {
      status: "STORNIERT",
      cancelledAt: new Date(),
      cancelReason: grund.trim() || "Vermietung hat Vorrang",
    },
  });

  if (buchung.gruppe) {
    await notifyGruppe(
      buchung.gruppe.id,
      terminGeaendertEmail({
        typ: "ABGESAGT",
        titel: buchung.titel,
        raumName: buchung.raum.name,
        alt: formatRange(buchung.startsAt, buchung.endsAt),
        grund: grund.trim() || "Eine Vermietung hat Vorrang.",
      })
    );
  }

  revalidatePath("/admin/vermietungen");
  return { ok: true };
}

const moveSchema = z
  .object({
    date: dateString,
    startTime: timeString,
    endTime: timeString,
  })
  .refine((d) => d.endTime > d.startTime, { message: "Ende muss nach dem Beginn liegen" });

/** Kollidierende Gruppenbuchung auf einen neuen Slot verschieben + Gruppe informieren. */
export async function moveGruppenBuchung(
  buchungId: string,
  input: unknown
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  const buchung = await prisma.buchung.findUnique({
    where: { id: buchungId },
    include: { raum: { select: { name: true } }, gruppe: { select: { id: true } } },
  });
  if (!buchung || buchung.art !== "GRUPPE") return { error: "Buchung nicht gefunden." };
  if (buchung.status !== "BESTAETIGT") return { error: "Buchung ist bereits storniert." };

  const newStart = berlinInstant(parsed.data.date, parsed.data.startTime);
  const newEnd = berlinInstant(parsed.data.date, parsed.data.endTime);

  const [check] = await checkAvailability(
    buchung.raumId,
    [{ start: newStart, end: newEnd }],
    { excludeBuchungIds: [buchungId] }
  );
  if (check && check.level !== "FREI") {
    return { error: "Der neue Zeitraum ist nicht frei — bitte anderen Slot wählen." };
  }

  const alt = formatRange(buchung.startsAt, buchung.endsAt);
  await prisma.buchung.update({
    where: { id: buchungId },
    data: { startsAt: newStart, endsAt: newEnd },
  });

  if (buchung.gruppe) {
    await notifyGruppe(
      buchung.gruppe.id,
      terminGeaendertEmail({
        typ: "VERSCHOBEN",
        titel: buchung.titel,
        raumName: buchung.raum.name,
        alt,
        neu: formatRange(newStart, newEnd),
        grund: "Eine Vermietung hat Vorrang.",
      })
    );
  }

  revalidatePath("/admin/vermietungen");
  return { ok: true };
}
