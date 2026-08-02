import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { bookings, contracts, settings } from "@/lib/db/schema";
import { validateSigningToken } from "@/lib/contract-signing";
import { renderContractPdf } from "@/lib/pdf/contract-template";
import { formatDate, formatDateTime } from "@/lib/format";
import { sendContractSignedConfirmation } from "@/lib/email/contract";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-ip";
import { checkContractSignRateLimit } from "@/lib/rate-limit";

const signSchema = z.object({
  signerName: z.string().trim().min(2, "Bitte Namen angeben.").max(200),
  signatureDataUrl: z.string().startsWith("data:image/png;base64,", "Ungültige Signatur."),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const ip = getClientIp(request) ?? "unknown";

  const { success } = await checkContractSignRateLimit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte versuchen Sie es später erneut." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Re-validate server-side — the page having rendered earlier proves nothing about
  // the token's current state (it may have expired or been used since).
  const validation = await validateSigningToken(token);
  if (!validation.valid) {
    return NextResponse.json({ error: "Dieser Link ist nicht mehr gültig." }, { status: 410 });
  }
  const { contract, context } = validation;

  const [settingsRow] = await db.select().from(settings).limit(1);
  if (!settingsRow) {
    return NextResponse.json({ error: "Einstellungen sind nicht konfiguriert." }, { status: 500 });
  }

  const signedAt = new Date();

  const pdfBuffer = await renderContractPdf({
    orgName: settingsRow.orgName,
    orgAddress: settingsRow.orgAddress,
    footerText: settingsRow.contractFooterText,
    renterName: context.renterName,
    renterEmail: context.renterEmail,
    renterPhone: context.renterPhone,
    roomNames: context.roomNames,
    scheduleLabel: context.scheduleLabel,
    priceNote: contract.priceNote,
    contractId: contract.id,
    createdDateLabel: formatDate(contract.createdAt),
    signature: {
      imageDataUrl: parsed.data.signatureDataUrl,
      signerName: parsed.data.signerName,
      signedAtLabel: formatDateTime(signedAt),
    },
  });

  const blob = await put(`contracts/${contract.id}/signed.pdf`, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
  });

  await db
    .update(contracts)
    .set({
      status: "signed",
      signedPdfUrl: blob.url,
      signedAt,
      signerName: parsed.data.signerName,
      signerIpAddress: ip,
      signingTokenHash: null,
      signingTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(contracts.id, contract.id));

  if (contract.bookingId) {
    await db
      .update(bookings)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(bookings.id, contract.bookingId));
  } else if (contract.seriesId) {
    await db
      .update(bookings)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(bookings.seriesId, contract.seriesId));
  }

  await sendContractSignedConfirmation({
    to: [context.renterEmail, settingsRow.adminNotificationEmail],
    requesterName: context.renterName,
    roomNames: context.roomNames,
    dateRangeLabel: context.scheduleLabel,
    pdfUrl: blob.url,
  });

  await logAudit({
    entityType: "contract",
    entityId: contract.id,
    action: "signed",
    ipAddress: ip,
    metadata: { signerName: parsed.data.signerName },
  });

  return NextResponse.json({ success: true });
}
