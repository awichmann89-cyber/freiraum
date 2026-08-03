"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { adminBuchungSchema } from "@/lib/zod-schemas";
import { zodErrorMessage } from "@/lib/action-result";
import { checkAvailability } from "@/lib/availability";
import { berlinInstant } from "@/lib/occurrences";
import { validatePostenDates } from "@/lib/posten-utils";
import { formatRange } from "@/lib/tz";

export type AdminBuchungResult = { ok: true } | { error: string; gruppenKonflikt?: boolean };

/**
 * Admin-Direktbuchung aus dem Kalender: legt sofort eine BESTAETIGTe Gruppen-Buchung an.
 * Vermietungen blocken hart; Kollisionen mit Gruppenterminen nur mit `force` überstimmbar.
 */
export async function createAdminBuchung(input: unknown): Promise<AdminBuchungResult> {
  await requireAdmin();

  const parsed = adminBuchungSchema.safeParse(input);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };
  const data = parsed.data;

  const dateError = validatePostenDates({ ...data, art: "EINZEL" });
  if (dateError) return { error: dateError };

  const [raum, gruppe] = await Promise.all([
    prisma.raum.findUnique({ where: { id: data.raumId, isActive: true }, select: { id: true } }),
    prisma.gruppe.findUnique({ where: { id: data.gruppeId, isActive: true }, select: { id: true } }),
  ]);
  if (!raum) return { error: "Der gewählte Raum existiert nicht oder ist deaktiviert." };
  if (!gruppe) return { error: "Die gewählte Gruppe existiert nicht oder ist deaktiviert." };

  const start = berlinInstant(data.startDate, data.startTime);
  const end = berlinInstant(data.endDate, data.endTime);

  // Re-Check in der Transaktion — Race mit parallelen Bestätigungen/Signaturen.
  const result = await prisma.$transaction(async (tx): Promise<AdminBuchungResult> => {
    const [check] = await checkAvailability(data.raumId, [{ start, end }], { db: tx });
    const konflikte = check?.konflikte ?? [];

    const vermietungen = konflikte.filter((k) => k.art === "VERMIETUNG");
    if (vermietungen.length > 0) {
      return {
        error: `Der Zeitraum kollidiert mit einer Vermietung (${formatRange(
          vermietungen[0].start,
          vermietungen[0].end
        )} – ${vermietungen[0].titel}). Vermietungen blocken verbindlich.`,
      };
    }

    const gruppenKonflikte = konflikte.filter((k) => k.art === "GRUPPE");
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

    await tx.buchung.create({
      data: {
        raumId: data.raumId,
        art: "GRUPPE",
        status: "BESTAETIGT",
        startsAt: start,
        endsAt: end,
        titel: data.titel,
        gruppeId: data.gruppeId,
      },
    });
    return { ok: true };
  });

  if ("ok" in result) revalidatePath("/kalender");
  return result;
}
