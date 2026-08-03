"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { vorlageSchema } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";
import { DEFAULT_VERTRAGSVORLAGE } from "@/lib/contract";

export async function saveVorlage(
  vorlageId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = vorlageSchema.safeParse({
    name: formData.get("name"),
    body: formData.get("body"),
    isDefault: formData.get("isDefault") === "on",
  });
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  try {
    await prisma.$transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.vertragsvorlage.updateMany({ data: { isDefault: false } });
      }
      if (vorlageId) {
        await tx.vertragsvorlage.update({ where: { id: vorlageId }, data: parsed.data });
      } else {
        await tx.vertragsvorlage.create({ data: parsed.data });
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Eine Vorlage mit diesem Namen existiert bereits." };
    }
    throw e;
  }

  revalidatePath("/admin/einstellungen/vorlagen");
  return { ok: true };
}

export async function deleteVorlage(vorlageId: string): Promise<ActionResult> {
  await requireAdmin();

  // Relation Vermietung->Vorlage ist SetNull; der eingefrorene contractText bleibt erhalten.
  await prisma.vertragsvorlage.delete({ where: { id: vorlageId } });

  revalidatePath("/admin/einstellungen/vorlagen");
  return { ok: true };
}

export async function createDefaultVorlage(): Promise<ActionResult> {
  await requireAdmin();

  const count = await prisma.vertragsvorlage.count();
  await prisma.vertragsvorlage.create({
    data: {
      name: count === 0 ? "Standardvertrag" : `Standardvertrag ${count + 1}`,
      body: DEFAULT_VERTRAGSVORLAGE,
      isDefault: count === 0,
    },
  });

  revalidatePath("/admin/einstellungen/vorlagen");
  return { ok: true };
}
