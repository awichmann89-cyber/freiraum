"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { gruppeSchema, userInviteSchema } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";
import { createActionToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { einladungEmail } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/base-url";

export async function saveGruppe(
  gruppeId: string | null,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = gruppeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  try {
    if (gruppeId) {
      await prisma.gruppe.update({ where: { id: gruppeId }, data: parsed.data });
    } else {
      await prisma.gruppe.create({ data: parsed.data });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Eine Gruppe mit diesem Namen existiert bereits." };
    }
    throw e;
  }

  revalidatePath("/admin/gruppen");
  return { ok: true };
}

export async function setGruppeActive(gruppeId: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  await prisma.gruppe.update({ where: { id: gruppeId }, data: { isActive } });
  revalidatePath("/admin/gruppen");
  return { ok: true };
}

async function sendeEinladung(user: { id: string; name: string; email: string }) {
  const raw = await createActionToken({ purpose: "EINLADUNG", userId: user.id });
  const mail = einladungEmail({ name: user.name, link: `${getBaseUrl()}/einladung/${raw}` });
  await sendEmail({ to: user.email, ...mail });
}

export async function inviteUser(
  gruppeId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = userInviteSchema.safeParse({ ...Object.fromEntries(formData), gruppeId });
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: "GRUPPE",
        gruppeId,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ein Zugang mit dieser E-Mail existiert bereits." };
    }
    throw e;
  }

  await sendeEinladung(user);
  revalidatePath(`/admin/gruppen/${gruppeId}`);
  return { ok: true };
}

export async function assignUserToGruppe(
  gruppeId: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return { error: "Zugang wählen." };

  const gruppe = await prisma.gruppe.findUnique({ where: { id: gruppeId } });
  if (!gruppe) return { error: "Gruppe nicht gefunden." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Zugang nicht gefunden." };
  if (user.gruppeId === gruppeId) return { error: "Der Zugang gehört bereits zu dieser Gruppe." };

  await prisma.user.update({ where: { id: userId }, data: { gruppeId } });

  revalidatePath(`/admin/gruppen/${gruppeId}`);
  if (user.gruppeId) revalidatePath(`/admin/gruppen/${user.gruppeId}`);
  revalidatePath("/admin/gruppen");
  return { ok: true };
}

export async function resendInvite(userId: string): Promise<ActionResult> {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Zugang nicht gefunden." };
  if (user.passwordHash) return { error: "Der Zugang ist bereits aktiviert." };

  await sendeEinladung(user);
  return { ok: true };
}

export async function setUserActive(userId: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  const user = await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath(`/admin/gruppen/${user.gruppeId}`);
  return { ok: true };
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  await requireAdmin();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { erstellteAnfragen: true, entschiedenePosten: true } } },
  });
  if (!user) return { error: "Zugang nicht gefunden." };
  if (user._count.erstellteAnfragen + user._count.entschiedenePosten > 0) {
    return { error: "Zugang hat bereits Anfragen — bitte stattdessen deaktivieren." };
  }

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath(`/admin/gruppen/${user.gruppeId}`);
  return { ok: true };
}
