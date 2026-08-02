import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contracts } from "@/lib/db/schema";
import { hashToken } from "@/lib/contract-token";
import { getContractContext, type ContractContext } from "@/lib/queries/contracts";
import type { Contract } from "@/lib/db/types";

export type SigningTokenValidation =
  | { valid: true; contract: Contract; context: ContractContext }
  | { valid: false; reason: "not_found" | "expired" | "already_used" | "context_missing" };

/**
 * Looks up a contract by its raw signing token (only the SHA-256 hash is stored)
 * and checks it's still usable. Re-run on both the signing page render and the
 * submit endpoint — never trust that a page having rendered means the token is
 * still valid by the time of submission.
 */
export async function validateSigningToken(token: string): Promise<SigningTokenValidation> {
  const hash = hashToken(token);
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.signingTokenHash, hash))
    .limit(1);

  if (!contract) {
    return { valid: false, reason: "not_found" };
  }
  if (contract.status !== "sent") {
    return { valid: false, reason: "already_used" };
  }
  if (!contract.signingTokenExpiresAt || contract.signingTokenExpiresAt < new Date()) {
    return { valid: false, reason: "expired" };
  }

  const context = await getContractContext(contract);
  if (!context) {
    return { valid: false, reason: "context_missing" };
  }

  return { valid: true, contract, context };
}
