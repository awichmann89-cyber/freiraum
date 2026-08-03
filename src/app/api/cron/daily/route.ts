import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dbDateToISO, expandWeekly, todayISO } from "@/lib/occurrences";
import { horizonISO } from "@/lib/posten-utils";

export const dynamic = "force-dynamic";

/**
 * Täglicher Cron (Vercel): hält aktive Serien bis zum Buchungshorizont materialisiert
 * und beendet abgelaufene Serien.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const heute = todayISO();
  const horizon = horizonISO();
  const horizonDate = new Date(`${horizon}T00:00:00.000Z`);

  // 1) Abgelaufene Serien beenden
  const beendet = await prisma.buchungsSerie.updateMany({
    where: { status: "AKTIV", endDate: { lt: new Date(`${heute}T00:00:00.000Z`) } },
    data: { status: "BEENDET" },
  });

  // 2) Aktive Serien nachmaterialisieren
  const serien = await prisma.buchungsSerie.findMany({
    where: { status: "AKTIV", materializedUntil: { lt: horizonDate } },
  });

  let neueBuchungen = 0;
  for (const serie of serien) {
    // Ab dem Tag nach materializedUntil erzeugen — idempotent.
    const fromISO = dbDateToISO(new Date(serie.materializedUntil.getTime() + 86_400_000));
    const intervals = expandWeekly(
      {
        weekday: serie.weekday,
        startTime: serie.startTime,
        endTime: serie.endTime,
        firstDate: dbDateToISO(serie.firstDate),
        endDate: serie.endDate ? dbDateToISO(serie.endDate) : null,
      },
      horizon,
      fromISO
    );

    await prisma.$transaction([
      ...(intervals.length > 0
        ? [
            prisma.buchung.createMany({
              data: intervals.map((iv) => ({
                raumId: serie.raumId,
                art: "GRUPPE" as const,
                startsAt: iv.start,
                endsAt: iv.end,
                titel: serie.titel,
                gruppeId: serie.gruppeId,
                serieId: serie.id,
              })),
            }),
          ]
        : []),
      prisma.buchungsSerie.update({
        where: { id: serie.id },
        data: { materializedUntil: horizonDate },
      }),
    ]);
    neueBuchungen += intervals.length;
  }

  // 3) Verträge ohne gültigen Signatur-Token -> ABGELAUFEN
  const abgelaufen = await prisma.vermietung.updateMany({
    where: {
      status: "VERTRAG_GESENDET",
      tokens: {
        none: { purpose: "VERTRAG_SIGNATUR", usedAt: null, expiresAt: { gt: new Date() } },
      },
    },
    data: { status: "ABGELAUFEN" },
  });

  return NextResponse.json({
    ok: true,
    beendeteSerien: beendet.count,
    nachmaterialisierteSerien: serien.length,
    neueBuchungen,
    abgelaufeneVertraege: abgelaufen.count,
  });
}
