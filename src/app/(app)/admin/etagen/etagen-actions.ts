"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { etageSchema } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";

export async function saveEtage(
  etageId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = etageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  try {
    if (etageId) {
      await prisma.etage.update({ where: { id: etageId }, data: parsed.data });
    } else {
      await prisma.etage.create({ data: parsed.data });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Dieses Level ist bereits vergeben." };
    }
    throw e;
  }

  revalidatePath("/admin/etagen");
  return { ok: true };
}

export async function deleteEtage(etageId: string): Promise<ActionResult> {
  await requireAdmin();

  const raumCount = await prisma.raum.count({ where: { etageId } });
  if (raumCount > 0) {
    return { error: "Etage hat noch Räume — bitte zuerst die Räume löschen oder verschieben." };
  }

  await prisma.etage.delete({ where: { id: etageId } });
  revalidatePath("/admin/etagen");
  return { ok: true };
}
