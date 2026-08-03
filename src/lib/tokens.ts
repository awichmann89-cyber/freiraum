import { createHash, randomBytes } from "crypto";
import type { TokenZweck } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export const TOKEN_TTL_HOURS: Record<TokenZweck, number> = {
  EINLADUNG: 14 * 24,
  PASSWORT_RESET: 2,
  VERTRAG_SIGNATUR: 30 * 24,
};

/**
 * Erzeugt einen neuen Token und invalidiert bestehende Tokens desselben
 * Zwecks für denselben User bzw. dieselbe Vermietung. Gibt den Klartext
 * zurück — der landet ausschließlich im Mail-Link.
 */
export async function createActionToken(opts: {
  purpose: TokenZweck;
  userId?: string;
  vermietungId?: string;
  ttlHours?: number;
}): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const ttl = opts.ttlHours ?? TOKEN_TTL_HOURS[opts.purpose];

  await prisma.$transaction([
    prisma.actionToken.deleteMany({
      where: {
        purpose: opts.purpose,
        ...(opts.userId ? { userId: opts.userId } : {}),
        ...(opts.vermietungId ? { vermietungId: opts.vermietungId } : {}),
      },
    }),
    prisma.actionToken.create({
      data: {
        tokenHash: hashToken(raw),
        purpose: opts.purpose,
        userId: opts.userId,
        vermietungId: opts.vermietungId,
        expiresAt: new Date(Date.now() + ttl * 60 * 60 * 1000),
      },
    }),
  ]);

  return raw;
}

/** Liefert den Token-Datensatz, wenn gültig (richtiger Zweck, unbenutzt, nicht abgelaufen). */
export async function findValidToken(raw: string, purpose: TokenZweck) {
  const token = await prisma.actionToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true, vermietung: true },
  });
  if (!token || token.purpose !== purpose || token.usedAt || token.expiresAt < new Date()) {
    return null;
  }
  return token;
}

export async function consumeToken(id: string) {
  await prisma.actionToken.update({ where: { id }, data: { usedAt: new Date() } });
}
