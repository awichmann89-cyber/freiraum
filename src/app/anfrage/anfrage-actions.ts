"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { mietanfrageSchema } from "@/lib/zod-schemas";
import { zodErrorMessage, type ActionResult } from "@/lib/action-result";
import { berlinInstant, todayISO } from "@/lib/occurrences";
import { nextVermietungsNummer } from "@/lib/settings";
import { sendEmail } from "@/lib/email";
import { mietanfrageBestaetigungEmail, neueMietanfrageEmail } from "@/lib/email-templates";
import { getBaseUrl } from "@/lib/base-url";

export async function submitMietanfrage(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  if (raw.raumId === "unklar") delete (raw as Record<string, unknown>).raumId;

  const parsed = mietanfrageSchema.safeParse(raw);
  if (!parsed.success) return { error: zodErrorMessage(parsed.error) };
  const data = parsed.data;

  if (data.startDate < todayISO()) {
    return { error: "Das Datum liegt in der Vergangenheit." };
  }

  let raumName: string | null = null;
  if (data.raumId) {
    const raum = await prisma.raum.findUnique({
      where: { id: data.raumId, isActive: true },
      select: { name: true },
    });
    if (!raum) return { error: "Der gewählte Raum existiert nicht." };
    raumName = raum.name;
  }

  const requestedStart = berlinInstant(data.startDate, data.startTime);
  const requestedEnd = berlinInstant(data.endDate, data.endTime);

  const vermietung = await prisma.vermietung.create({
    data: {
      nummer: await nextVermietungsNummer(),
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      organization: data.organization,
      purpose: data.purpose,
      message: data.message,
      raumId: data.raumId ?? null,
      requestedStart,
      requestedEnd,
    },
  });

  // Mail 5: Eingangsbestätigung an Anfragende:n
  await sendEmail({
    to: data.contactEmail,
    ...mietanfrageBestaetigungEmail({
      contactName: data.contactName,
      raumName,
      start: requestedStart,
      end: requestedEnd,
    }),
  });

  // Mail 6: Benachrichtigung an Admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { email: true },
  });
  if (admins.length > 0) {
    await sendEmail({
      to: admins.map((a) => a.email),
      ...neueMietanfrageEmail({
        nummer: vermietung.nummer,
        contactName: data.contactName,
        organization: data.organization,
        purpose: data.purpose,
        raumName,
        start: requestedStart,
        end: requestedEnd,
        link: `${getBaseUrl()}/admin/vermietungen/${vermietung.id}`,
      }),
    });
  }

  redirect("/anfrage/danke");
}
