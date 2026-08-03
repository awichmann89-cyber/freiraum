import { Resend } from "resend";

export type EmailAttachment = {
  filename: string;
  content: Buffer;
};

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

/**
 * Versendet eine Mail über Resend. Ohne RESEND_API_KEY wird die Mail nur
 * geloggt (lokale Entwicklung), der Aufruf gilt trotzdem als erfolgreich.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ ok: boolean }> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  if (!process.env.RESEND_API_KEY) {
    console.log(
      `[email log-only] an: ${recipients.join(", ")} | betreff: ${options.subject}\n${options.html}`
    );
    return { ok: true };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Freiraum <apps@alw-mediaworks.de>",
      to: recipients,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });
    if (error) {
      console.error("[email] Versand fehlgeschlagen:", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] Versand fehlgeschlagen:", err);
    return { ok: false };
  }
}
