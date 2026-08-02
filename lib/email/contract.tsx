import "server-only";
import { sendEmail, getSenderSettings } from "./send";
import ContractSigningLink from "@/emails/contract-signing-link";
import ContractSignedConfirmation from "@/emails/contract-signed-confirmation";

const APP_BASE_URL = process.env.APP_BASE_URL ?? "http://localhost:3000";

interface ContractSigningLinkParams {
  requesterEmail: string;
  requesterName: string;
  roomNames: string[];
  dateRangeLabel: string;
  token: string;
  expiresAtLabel: string;
}

export async function sendContractSigningLink(params: ContractSigningLinkParams): Promise<void> {
  const senderSettings = await getSenderSettings();
  await sendEmail({
    to: params.requesterEmail,
    subject: "Ihr Mietvertrag ist bereit zur Unterschrift",
    react: (
      <ContractSigningLink
        orgName={senderSettings.orgName}
        requesterName={params.requesterName}
        roomNames={params.roomNames}
        dateRangeLabel={params.dateRangeLabel}
        signUrl={`${APP_BASE_URL}/vertrag/${params.token}`}
        expiresAtLabel={params.expiresAtLabel}
      />
    ),
  });
}

interface ContractSignedConfirmationParams {
  to: string | string[];
  requesterName: string;
  roomNames: string[];
  dateRangeLabel: string;
  pdfUrl: string;
}

export async function sendContractSignedConfirmation(
  params: ContractSignedConfirmationParams
): Promise<void> {
  const senderSettings = await getSenderSettings();
  await sendEmail({
    to: params.to,
    subject: "Vertrag unterschrieben – Buchung bestätigt",
    react: (
      <ContractSignedConfirmation
        orgName={senderSettings.orgName}
        requesterName={params.requesterName}
        roomNames={params.roomNames}
        dateRangeLabel={params.dateRangeLabel}
        pdfUrl={params.pdfUrl}
      />
    ),
  });
}
