"use server";

import bcrypt from "bcryptjs";
import type { TokenZweck } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createActionToken, findValidToken } from "@/lib/tokens";
import { passwordSchema } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";
import { sendEmail } from "@/lib/email";
import { passwortResetEmail } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/base-url";

/** Einladung annehmen bzw. Passwort zurücksetzen — Token-basiert, ohne Login. */
export async function setPasswordWithToken(
  purpose: Extract<TokenZweck, "EINLADUNG" | "PASSWORT_RESET">,
  rawToken: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  const token = await findValidToken(rawToken, purpose);
  if (!token?.user) {
    return { error: "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: token.user.id }, data: { passwordHash } }),
    prisma.actionToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
  ]);

  return { ok: true };
}

/** Passwort-vergessen-Formular: antwortet immer gleich (kein User-Enumeration-Leak). */
export async function requestPasswordReset(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .toLowerCase()
    .trim();
  if (!email) return { error: "Bitte E-Mail-Adresse angeben." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.isActive && user.passwordHash) {
    const raw = await createActionToken({ purpose: "PASSWORT_RESET", userId: user.id });
    const mail = passwortResetEmail({
      name: user.name,
      link: `${getBaseUrl()}/passwort-reset/${raw}`,
    });
    await sendEmail({ to: user.email, ...mail });
  }

  return { ok: true };
}
