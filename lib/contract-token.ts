import "server-only";
import { randomBytes, createHash } from "crypto";

export function generateSigningToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Plain (unhashed) capability token — used for the long-lived PDF access link. */
export function generatePlainToken(): string {
  return randomBytes(24).toString("base64url");
}
