"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { raumSchema } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";

export async function saveRaum(
  raumId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = raumSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  const data = {
    name: parsed.data.name,
    etageId: parsed.data.etageId,
    sizeSqm: parsed.data.sizeSqm ?? null,
    capacity: parsed.data.capacity ?? null,
    priceHourly: parsed.data.priceHourly ?? null,
    priceDaily: parsed.data.priceDaily ?? null,
  };

  try {
    if (raumId) {
      await prisma.raum.update({ where: { id: raumId }, data });
    } else {
      await prisma.raum.create({ data });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Auf dieser Etage gibt es bereits einen Raum mit diesem Namen." };
    }
    throw e;
  }

  revalidatePath("/admin/raeume");
  return { ok: true };
}

export async function setRaumActive(raumId: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.raum.update({ where: { id: raumId }, data: { isActive } });
  revalidatePath("/admin/raeume");
  return { ok: true };
}

export async function deleteRaum(raumId: string): Promise<ActionResult> {
  await requireAdmin();

  const [buchungen, posten, vermietungen] = await Promise.all([
    prisma.buchung.count({ where: { raumId } }),
    prisma.anfragePosten.count({ where: { raumId } }),
    prisma.vermietung.count({ where: { raumId } }),
  ]);
  if (buchungen + posten + vermietungen > 0) {
    return {
      error: "Raum hat bereits Buchungen oder Anfragen — bitte stattdessen deaktivieren.",
    };
  }

  await prisma.raum.delete({ where: { id: raumId } });
  revalidatePath("/admin/raeume");
  return { ok: true };
}
