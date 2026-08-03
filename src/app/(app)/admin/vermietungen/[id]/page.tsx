import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkAvailability } from "@/lib/availability";
import { formatDate, formatDateShort, formatRange, formatTime } from "@/lib/tz";
import { formatEuro } from "@/lib/contract";
import {
  berlinDateISO,
  berlinMinutes,
  minToHHMM,
  splitIntoBerlinDays,
  startOfWeekISO,
} from "@/lib/calendar-time";
import { addDaysISO, todayISO } from "@/lib/occurrences";
import { getWeekEvents, type CalendarEventVM } from "@/lib/calendar-data";
import { RoomCalendar } from "@/components/calendar/room-calendar";
import { CalendarNav } from "@/components/calendar/calendar-nav";
import { VermietungStatusBadge } from "../vermietung-status-badge";
import { VertragForm, type VertragFormDefaults } from "./vertrag-form";
import { DeclineButton, StornoButton } from "./status-actions";
import { KonfliktListe, type KonfliktRow } from "./konflikt-liste";

export const metadata: Metadata = { title: "Vermietung" };

export default async function VermietungDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ datum?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const vermietung = await prisma.vermietung.findUnique({
    where: { id },
    include: { raum: { select: { id: true, name: true } } },
  });
  if (!vermietung) notFound();

  const start = vermietung.startsAt ?? vermietung.requestedStart;
  const end = vermietung.endsAt ?? vermietung.requestedEnd;
  const editable = ["NEU", "ABGELAUFEN", "VERTRAG_GESENDET"].includes(vermietung.status);

  // Verfügbarkeit (für die Bearbeitungs-Phasen)
  const verfuegbarkeit =
    editable && vermietung.raum
      ? await checkAvailability(vermietung.raum.id, [{ start, end }])
      : null;
  const konflikte = verfuegbarkeit?.[0]?.konflikte ?? [];
  const vermietungsKonflikte = konflikte.filter((k) => k.art === "VERMIETUNG");
  const gruppenKonflikte = konflikte.filter((k) => k.art === "GRUPPE");

  // Wochenkalender des Raums, damit Überschneidungen im Kontext sichtbar sind.
  // Der Anfrage-Zeitraum selbst wird als eigener (pending) Block eingeblendet.
  let kalender: {
    raumId: string;
    mondayISO: string;
    datum: string;
    wocheLabel: string;
    events: CalendarEventVM[];
  } | null = null;
  if (verfuegbarkeit && vermietung.raum) {
    const datum = /^\d{4}-\d{2}-\d{2}$/.test(sp.datum ?? "") ? sp.datum! : berlinDateISO(start);
    const mondayISO = startOfWeekISO(datum);
    const sundayISO = addDaysISO(mondayISO, 6);
    const events = await getWeekEvents({ mondayISO, raumIds: [vermietung.raum.id] });
    for (const seg of splitIntoBerlinDays(start, end)) {
      if (seg.dateISO < mondayISO || seg.dateISO > sundayISO) continue;
      events.push({
        id: `anfrage-${vermietung.id}-${seg.dateISO}`,
        roomId: vermietung.raum.id,
        roomName: vermietung.raum.name,
        dateISO: seg.dateISO,
        startMin: seg.startMin,
        endMin: seg.endMin,
        title: `Diese Anfrage (${vermietung.nummer})`,
        subtitle: vermietung.contactName,
        kind: "external",
        status: "pending",
      });
    }
    const wocheLabel = `${formatDateShort(new Date(`${mondayISO}T12:00:00`))} – ${formatDateShort(
      new Date(`${sundayISO}T12:00:00`)
    )}`;
    kalender = { raumId: vermietung.raum.id, mondayISO, datum, wocheLabel, events };
  }

  // Formular-Daten (Räume, Vorlagen, Defaults)
  let formData: {
    raeume: { id: string; name: string; etageName: string; priceHourly: number | null; priceDaily: number | null }[];
    vorlagen: { id: string; name: string }[];
    defaults: VertragFormDefaults;
  } | null = null;

  if (editable) {
    const [raeume, vorlagen] = await Promise.all([
      prisma.raum.findMany({
        where: { isActive: true },
        orderBy: [{ etage: { level: "asc" } }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          priceHourly: true,
          priceDaily: true,
          etage: { select: { name: true } },
        },
      }),
      prisma.vertragsvorlage.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isDefault: true } }),
    ]);

    formData = {
      raeume: raeume.map((r) => ({
        id: r.id,
        name: r.name,
        etageName: r.etage.name,
        priceHourly: r.priceHourly ? Number(r.priceHourly) : null,
        priceDaily: r.priceDaily ? Number(r.priceDaily) : null,
      })),
      vorlagen: vorlagen.map((v) => ({ id: v.id, name: v.name })),
      defaults: {
        raumId: vermietung.raumId ?? "",
        startDate: berlinDateISO(start),
        startTime: minToHHMM(berlinMinutes(start)),
        endDate: berlinDateISO(end),
        endTime: minToHHMM(berlinMinutes(end)),
        priceType: vermietung.priceType ?? "STUNDE",
        basePrice: vermietung.basePrice ? String(Number(vermietung.basePrice)).replace(".", ",") : "",
        discountPercent: vermietung.discountPercent
          ? String(Number(vermietung.discountPercent)).replace(".", ",")
          : "0",
        vorlageId: vermietung.vorlageId ?? vorlagen.find((v) => v.isDefault)?.id ?? vorlagen[0]?.id ?? "",
        adminNote: vermietung.adminNote ?? "",
      },
    };
  }

  // Konfliktliste für SIGNIERT: kollidierende Gruppenbuchungen
  let signierteKonflikte: KonfliktRow[] = [];
  if (vermietung.status === "SIGNIERT" && vermietung.raum && vermietung.startsAt && vermietung.endsAt) {
    const rows = await prisma.buchung.findMany({
      where: {
        raumId: vermietung.raum.id,
        art: "GRUPPE",
        status: "BESTAETIGT",
        startsAt: { lt: vermietung.endsAt },
        endsAt: { gt: vermietung.startsAt },
      },
      include: { gruppe: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    });
    signierteKonflikte = rows.map((b) => ({
      buchungId: b.id,
      titel: b.titel,
      gruppeName: b.gruppe?.name ?? "?",
      zeitraum: formatRange(b.startsAt, b.endsAt),
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            Mietanfrage {vermietung.nummer}
            <VermietungStatusBadge status={vermietung.status} />
          </h1>
          <p className="text-sm text-muted-foreground">
            Eingegangen am {formatDate(vermietung.createdAt)}
            {vermietung.sentAt ? ` · Vertrag gesendet am ${formatDate(vermietung.sentAt)}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {editable ? <DeclineButton vermietungId={vermietung.id} /> : null}
          {vermietung.status === "SIGNIERT" ? <StornoButton vermietungId={vermietung.id} /> : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{vermietung.contactName}</p>
            {vermietung.organization ? <p>{vermietung.organization}</p> : null}
            <p>
              <a href={`mailto:${vermietung.contactEmail}`} className="underline">
                {vermietung.contactEmail}
              </a>
            </p>
            {vermietung.contactPhone ? <p>{vermietung.contactPhone}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {vermietung.status === "NEU" ? "Wunschtermin" : "Eckdaten"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Raum: </span>
              {vermietung.raum?.name ?? "Noch unklar — Beratung gewünscht"}
            </p>
            <p>
              <span className="text-muted-foreground">Zeitraum: </span>
              {formatRange(start, end)}
            </p>
            <p>
              <span className="text-muted-foreground">Zweck: </span>
              {vermietung.purpose}
            </p>
            {vermietung.finalPrice != null ? (
              <p>
                <span className="text-muted-foreground">Preis: </span>
                {formatEuro(Number(vermietung.finalPrice))}
                {vermietung.discountPercent && Number(vermietung.discountPercent) > 0
                  ? ` (inkl. ${Number(vermietung.discountPercent)} % Rabatt)`
                  : ""}
              </p>
            ) : null}
            {vermietung.message ? (
              <p className="mt-2 rounded-md bg-muted p-2">{vermietung.message}</p>
            ) : null}
            {vermietung.declineReason ? (
              <p className="text-muted-foreground">Ablehnungsgrund: {vermietung.declineReason}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Verfügbarkeit (Bearbeitungsphasen) */}
      {verfuegbarkeit ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Verfügbarkeit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {konflikte.length === 0 ? (
              <p className="text-emerald-700 dark:text-emerald-400">
                ✓ Der Raum ist im gewünschten Zeitraum frei.
              </p>
            ) : (
              <>
                {vermietungsKonflikte.length > 0 ? (
                  <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40">
                    <p className="font-medium">⛔ Kollision mit anderer Vermietung — blockiert:</p>
                    <ul className="mt-1 list-inside list-disc">
                      {vermietungsKonflikte.map((k) => (
                        <li key={k.buchungId}>
                          {formatRange(k.start, k.end)} – {k.titel}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {gruppenKonflikte.length > 0 ? (
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/40">
                    <p className="font-medium">
                      ⚠️ Kollision mit Gruppenbuchungen — blockiert die Vermietung nicht, die
                      Termine müssten nach der Unterschrift abgesagt/verschoben werden:
                    </p>
                    <ul className="mt-1 list-inside list-disc">
                      {gruppenKonflikte.map((k) => (
                        <li key={k.buchungId}>
                          {formatRange(k.start, k.end)} – {k.titel}
                          {k.gruppeName ? ` (${k.gruppeName})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            )}

            {kalender ? (
              <div className="space-y-2 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">Kalender · {vermietung.raum?.name}</p>
                  <CalendarNav
                    label={kalender.wocheLabel}
                    prevHref={`/admin/vermietungen/${vermietung.id}?datum=${addDaysISO(kalender.mondayISO, -7)}`}
                    nextHref={`/admin/vermietungen/${vermietung.id}?datum=${addDaysISO(kalender.mondayISO, 7)}`}
                    todayHref={`/admin/vermietungen/${vermietung.id}?datum=${todayISO()}`}
                  />
                </div>
                <RoomCalendar
                  raumId={kalender.raumId}
                  mondayISO={kalender.mondayISO}
                  activeDateISO={kalender.datum}
                  events={kalender.events}
                  basePath={`/admin/vermietungen/${vermietung.id}`}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {/* Eingefrorener Vertragstext */}
      {vermietung.contractText && vermietung.status !== "NEU" ? (
        <details className="rounded-lg border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            Vertragstext anzeigen{" "}
            {vermietung.status === "VERTRAG_GESENDET"
              ? "(eingefroren — wird beim erneuten Senden neu erzeugt)"
              : ""}
          </summary>
          <div className="max-h-96 overflow-y-auto whitespace-pre-wrap p-4 text-sm">
            {vermietung.contractText}
          </div>
        </details>
      ) : null}

      {/* Vertragsformular */}
      {editable && formData ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {vermietung.status === "NEU" ? "Vertrag erstellen" : "Vertrag anpassen & erneut senden"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formData.vorlagen.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Es gibt noch keine Vertragsvorlage — bitte zuerst unter{" "}
                <a href="/admin/einstellungen/vorlagen" className="underline">
                  Einstellungen → Vertragsvorlagen
                </a>{" "}
                eine anlegen.
              </p>
            ) : (
              <VertragForm
                vermietungId={vermietung.id}
                raeume={formData.raeume}
                vorlagen={formData.vorlagen}
                defaults={formData.defaults}
                resend={vermietung.status !== "NEU"}
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Signiert: Infos + Konfliktauflösung */}
      {vermietung.status === "SIGNIERT" ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Unterschrift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Digital unterschrieben von <strong>{vermietung.signedName}</strong>
                {vermietung.signedAt
                  ? ` am ${formatDate(vermietung.signedAt)} um ${formatTime(vermietung.signedAt)} Uhr`
                  : ""}
                {vermietung.signerIp ? ` (IP: ${vermietung.signerIp})` : ""}
                . Der Termin ist im Kalender geblockt.
              </p>
              <div className="flex flex-wrap gap-2">
                {vermietung.contractPdfUrl ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={vermietung.contractPdfUrl} target="_blank" rel="noopener noreferrer">
                      <FileDown className="size-4" /> Signierter Vertrag (PDF)
                    </a>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {signierteKonflikte.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Kollidierende Gruppentermine ({signierteKonflikte.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Die Vermietung hat Vorrang — sage die betroffenen Termine ab oder verschiebe
                  sie. Die Gruppe wird automatisch per E-Mail informiert.
                </p>
                <KonfliktListe konflikte={signierteKonflikte} />
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      {vermietung.adminNote && !editable ? (
        <p className="text-sm text-muted-foreground">Interne Notiz: {vermietung.adminNote}</p>
      ) : null}
    </div>
  );
}
