"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { floorplanSaveSchema, raumFormenSchema } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";

function revalidatePlan(etageId: string) {
  revalidatePath(`/admin/etagen/${etageId}/plan`);
  revalidatePath(`/etagen/${etageId}`);
  revalidatePath("/etagen");
}

/** Nach dem Client-Upload: Plan-Assets an der Etage hinterlegen. */
export async function saveFloorplan(etageId: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = floorplanSaveSchema.safeParse(input);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  const etage = await prisma.etage.findUnique({ where: { id: etageId } });
  if (!etage) return { error: "Etage nicht gefunden." };

  await prisma.etage.update({
    where: { id: etageId },
    data: {
      floorplanPdfUrl: parsed.data.pdfUrl,
      floorplanImageUrl: parsed.data.imageUrl,
      floorplanImgWidth: parsed.data.width,
      floorplanImgHeight: parsed.data.height,
    },
  });

  revalidatePlan(etageId);
  return { ok: true };
}

/** Entfernt den Plan (Formen bleiben erhalten — normalisierte Koordinaten überleben einen Re-Upload). */
export async function removeFloorplan(etageId: string): Promise<ActionResult> {
  await requireAdmin();

  await prisma.etage.update({
    where: { id: etageId },
    data: {
      floorplanPdfUrl: null,
      floorplanImageUrl: null,
      floorplanImgWidth: null,
      floorplanImgHeight: null,
    },
  });

  revalidatePlan(etageId);
  return { ok: true };
}

/** Ersetzt alle Raumformen einer Etage (Bulk-Save aus dem Editor). */
export async function saveRaumFormen(etageId: string, input: unknown): Promise<ActionResult> {
  await requireAdmin();

  const parsed = raumFormenSchema.safeParse(input);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  const raumIds = parsed.data.map((s) => s.raumId);
  if (new Set(raumIds).size !== raumIds.length) {
    return { error: "Jeder Raum darf nur eine Form haben." };
  }

  const raeume = await prisma.raum.findMany({
    where: { id: { in: raumIds }, etageId },
    select: { id: true },
  });
  if (raeume.length !== raumIds.length) {
    return { error: "Mindestens ein Raum gehört nicht zu dieser Etage." };
  }

  await prisma.$transaction([
    prisma.raumForm.deleteMany({ where: { etageId } }),
    ...(parsed.data.length > 0
      ? [
          prisma.raumForm.createMany({
            data: parsed.data.map((s) => ({
              etageId,
              raumId: s.raumId,
              kind: s.kind,
              points: s.points,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePlan(etageId);
  return { ok: true };
}
