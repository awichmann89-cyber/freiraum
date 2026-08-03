"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { findValidToken } from "@/lib/tokens";
import { signSchema } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";
import { checkAvailability } from "@/lib/availability";
import { generateVertragPdf } from "@/lib/vertrag-pdf";
import { storeFile } from "@/lib/storage";
import { getSetting } from "@/lib/settings";
import { formatEuro } from "@/lib/contract";
import { sendEmail } from "@/lib/email";
import { vertragSigniertEmail } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/base-url";

class SignConflictError extends Error {}

/** VERTRAG_GESENDET -> SIGNIERT: Signatur speichern, PDF erzeugen, Buchung blocken, Mails senden. */
export async function signVertrag(rawToken: string, input: unknown): Promise<ActionResult> {
  const parsed = signSchema.safeParse(input);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  const token = await findValidToken(rawToken, "VERTRAG_SIGNATUR");
  if (!token?.vermietungId) {
    return { error: "Der Link ist ungültig oder abgelaufen. Bitte wende dich an die Verwaltung." };
  }

  const vermietung = await prisma.vermietung.findUnique({
    where: { id: token.vermietungId },
    include: { raum: { select: { id: true, name: true } } },
  });
  if (
    !vermietung ||
    vermietung.status !== "VERTRAG_GESENDET" ||
    !vermietung.raum ||
    !vermietung.startsAt ||
    !vermietung.endsAt ||
    !vermietung.contractText
  ) {
    return { error: "Dieser Vertrag kann nicht mehr unterschrieben werden." };
  }

  // Signatur-PNG dekodieren
  const base64 = parsed.data.signatureDataUrl.slice("data:image/png;base64,".length);
  const signaturePng = Buffer.from(base64, "base64");
  if (signaturePng.length < 500) {
    return { error: "Die Unterschrift scheint leer zu sein — bitte erneut unterschreiben." };
  }

  const signedAt = new Date();
  const hausName = await getSetting("hausName");
  const headerList = await headers();
  const signerIp =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  // PDF erzeugen und Dateien ablegen (klein, serverseitig erzeugt)
  const pdf = await generateVertragPdf({
    nummer: vermietung.nummer,
    hausName,
    contractText: vermietung.contractText,
    signedName: parsed.data.name,
    signedAt,
    signaturePng,
  });
  const [signatureUrl, contractPdfUrl] = await Promise.all([
    storeFile(signaturePng, `signatur-${vermietung.nummer}.png`, "image/png", "vertraege"),
    storeFile(pdf, `vertrag-${vermietung.nummer}.pdf`, "application/pdf", "vertraege"),
  ]);

  try {
    await prisma.$transaction(async (tx) => {
      // Re-Check: kollidiert der Zeitraum inzwischen mit einer anderen Vermietung?
      const [check] = await checkAvailability(
        vermietung.raum!.id,
        [{ start: vermietung.startsAt!, end: vermietung.endsAt! }],
        { arten: ["VERMIETUNG"], db: tx }
      );
      if (check && check.konflikte.length > 0) {
        throw new SignConflictError(
          "Der Zeitraum wurde zwischenzeitlich anderweitig vergeben. Bitte kontaktiere die Verwaltung."
        );
      }

      const gated = await tx.vermietung.updateMany({
        where: { id: vermietung.id, status: "VERTRAG_GESENDET" },
        data: {
          status: "SIGNIERT",
          signedAt,
          signedName: parsed.data.name,
          signerIp,
          signatureUrl,
          contractPdfUrl,
        },
      });
      if (gated.count === 0) {
        throw new SignConflictError("Der Vertrag wurde bereits unterschrieben.");
      }

      await tx.actionToken.update({ where: { id: token.id }, data: { usedAt: signedAt } });

      // Erst jetzt wird der Raum geblockt
      await tx.buchung.create({
        data: {
          raumId: vermietung.raum!.id,
          art: "VERMIETUNG",
          startsAt: vermietung.startsAt!,
          endsAt: vermietung.endsAt!,
          titel: vermietung.purpose,
          vermietungId: vermietung.id,
        },
      });
    });
  } catch (e) {
    if (e instanceof SignConflictError) return { error: e.message };
    throw e;
  }

  // Mail 8: an Admins (mit Link) und als Kopie an die Mieter:in — beide mit PDF-Anhang
  const preis = formatEuro(Number(vermietung.finalPrice ?? 0));
  const attachment = { filename: `Vertrag-${vermietung.nummer}.pdf`, content: pdf };
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { email: true },
  });

  const mailData = {
    nummer: vermietung.nummer,
    contactName: vermietung.contactName,
    raumName: vermietung.raum.name,
    start: vermietung.startsAt,
    end: vermietung.endsAt,
    preis,
  };
  if (admins.length > 0) {
    await sendEmail({
      to: admins.map((a) => a.email),
      ...vertragSigniertEmail({
        ...mailData,
        adminLink: `${getBaseUrl()}/admin/vermietungen/${vermietung.id}`,
      }),
      attachments: [attachment],
    });
  }
  await sendEmail({
    to: vermietung.contactEmail,
    ...vertragSigniertEmail(mailData),
    attachments: [attachment],
  });

  return { ok: true };
}
