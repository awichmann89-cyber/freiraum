import "server-only";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY ist nicht gesetzt.");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface SenderSettings {
  adminNotificationEmail: string;
  senderEmail: string;
  senderName: string;
  orgName: string;
}

export async function getSenderSettings(): Promise<SenderSettings> {
  const [row] = await db.select().from(settings).limit(1);
  if (!row) {
    throw new Error(
      "Einstellungen nicht gefunden. Bitte zuerst das Seed-Skript ausführen oder Einstellungen anlegen."
    );
  }
  return row;
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  react: React.ReactNode;
}): Promise<void> {
  const senderSettings = await getSenderSettings();
  const from = `${senderSettings.senderName} <${senderSettings.senderEmail}>`;
  const client = getResendClient();

  const { error } = await client.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    react: params.react,
  });

  if (error) {
    console.error("Resend send error:", error);
    throw new Error("E-Mail konnte nicht gesendet werden.");
  }
}
