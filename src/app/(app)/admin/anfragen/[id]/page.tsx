import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Repeat } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkAvailability } from "@/lib/availability";
import { getWeekEvents } from "@/lib/calendar-data";
import { startOfWeekISO, berlinDateISO } from "@/lib/calendar-time";
import { dbDateToISO } from "@/lib/occurrences";
import { horizonISO, postenBeschreibungFromDb, postenIntervalsFromDb } from "@/lib/posten-utils";
import { formatDate, formatRange } from "@/lib/tz";
import { RoomCalendar } from "@/components/calendar/room-calendar";
import { PostenDecision } from "./posten-decision";

export const metadata: Metadata = { title: "Anfrage prüfen" };

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "BESTAETIGT":
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Bestätigt</Badge>;
    case "ABGELEHNT":
      return <Badge variant="destructive">Abgelehnt</Badge>;
    default:
      return <Badge variant="outline">Offen</Badge>;
  }
}

export default async function AdminAnfrageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anfrage = await prisma.buchungsAnfrage.findUnique({
    where: { id },
    include: {
      gruppe: { select: { name: true, color: true } },
      createdBy: { select: { name: true, email: true } },
      posten: {
        include: { raum: { select: { id: true, name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!anfrage) notFound();

  const horizon = horizonISO();

  // Verfügbarkeit + Wochen-Kalenderdaten je offenem Posten
  const postenDetails = await Promise.all(
    anfrage.posten.map(async (p) => {
      if (p.status !== "ANGEFRAGT") return { posten: p, results: null, week: null };

      const intervals = postenIntervalsFromDb(p, horizon);
      const results = await checkAvailability(p.raumId, intervals);

      const anchorISO =
        p.art === "EINZEL" ? berlinDateISO(p.startsAt!) : dbDateToISO(p.firstDate!);
      const mondayISO = startOfWeekISO(anchorISO);
      const events = await getWeekEvents({ mondayISO, raumIds: [p.raumId] });

      return { posten: p, results, week: { mondayISO, anchorISO, events } };
    })
  );

  const offen = anfrage.posten.filter((p) => p.status === "ANGEFRAGT").length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
          Anfrage von
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: anfrage.gruppe.color }}
            />
            {anfrage.gruppe.name}
          </span>
          {offen > 0 ? <Badge>{offen} offen</Badge> : <Badge variant="secondary">erledigt</Badge>}
        </h1>
        <p className="text-sm text-muted-foreground">
          Eingegangen am {formatDate(anfrage.createdAt)} von {anfrage.createdBy.name} (
          {anfrage.createdBy.email})
        </p>
        {anfrage.notiz ? (
          <p className="mt-1 rounded-md bg-muted p-2 text-sm">{anfrage.notiz}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        {postenDetails.map(({ posten: p, results, week }) => (
          <Card key={p.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {p.art === "WOECHENTLICH" ? <Repeat className="size-4" /> : null}
                {p.titel}
                <StatusBadge status={p.status} />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {p.raum.name} · {postenBeschreibungFromDb(p)}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.status === "ANGEFRAGT" && results ? (
                <>
                  {(() => {
                    const belegte = results.filter((r) => r.level !== "FREI");
                    if (belegte.length === 0) {
                      return (
                        <p className="text-sm text-emerald-700 dark:text-emerald-400">
                          ✓ Alle {results.length > 1 ? `${results.length} Termine` : "Zeiten"} frei
                          {p.art === "WOECHENTLICH" ? " (geprüft bis zum Buchungshorizont)" : ""}.
                        </p>
                      );
                    }
                    return (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
                        <p className="font-medium">
                          ⚠️ {belegte.length} von {results.length} Termin
                          {results.length === 1 ? "" : "en"} kollidiert:
                        </p>
                        <ul className="mt-1 list-inside list-disc">
                          {belegte.slice(0, 6).flatMap((r) =>
                            r.konflikte.slice(0, 2).map((k) => (
                              <li key={`${r.interval.start.toISOString()}-${k.buchungId}`}>
                                {formatRange(k.start, k.end)} – {k.titel}
                                {k.gruppeName ? ` (${k.gruppeName})` : ""}
                                {k.art === "VERMIETUNG" ? " · Vermietung (blockiert)" : ""}
                              </li>
                            ))
                          )}
                          {belegte.length > 6 ? <li>… weitere</li> : null}
                        </ul>
                      </div>
                    );
                  })()}

                  {week ? (
                    <details className="rounded-md border">
                      <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                        Raumkalender der Woche anzeigen
                      </summary>
                      <div className="p-2">
                        <RoomCalendar
                          raumId={p.raum.id}
                          mondayISO={week.mondayISO}
                          activeDateISO={week.anchorISO}
                          events={week.events}
                          canBook={false}
                          basePath={`/admin/anfragen/${anfrage.id}`}
                        />
                      </div>
                    </details>
                  ) : null}

                  <PostenDecision postenId={p.id} />
                </>
              ) : null}

              {p.status === "ABGELEHNT" && p.rejectReason ? (
                <p className="text-sm text-muted-foreground">Begründung: {p.rejectReason}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
