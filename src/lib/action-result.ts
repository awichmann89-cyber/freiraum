import type { ZodError } from "zod";

export type ActionResult = { ok: true } | { error: string } | undefined;

export function zodErrorMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Ungültige Eingabe";
}
