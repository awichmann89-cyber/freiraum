import type { Metadata } from "next";
import { CircleCheck, FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/contract";
import { formatDate, formatRange, formatTime } from "@/lib/tz";
import { getSetting } from "@/lib/settings";
import { SignForm } from "./sign-form";

export const metadata: Metadata = { title: "Mietvertrag" };

function Shell({ hausName, children }: { hausName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4">
          <span className="text-lg font-semibold tracking-tight">{hausName}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">{children}</main>
    </div>
  );
}

function InfoCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  );
}

export default async function VertragPage({ params }: { params: Promise<{ token: string }> }) {
  const { token: rawToken } = await params;
  const hausName = await getSetting("hausName");

  const token = await prisma.actionToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      vermietung: { include: { raum: { select: { name: true, etage: { select: { name: true } } } } } },
    },
  });

  const vermietung = token?.purpose === "VERTRAG_SIGNATUR" ? token.vermietung : null;
  if (!token || !vermietung) {
    return (
      <Shell hausName={hausName}>
        <InfoCard text="Dieser Vertragslink ist ungültig. Bitte wende dich an die Verwaltung." />
      </Shell>
    );
  }

  // Bereits signiert: Bestätigung + PDF-Download
  if (vermietung.status === "SIGNIERT") {
    return (
      <Shell hausName={hausName}>
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            <CircleCheck className="mx-auto size-10 text-emerald-600" />
            <h1 className="text-xl font-semibold">Vertrag unterschrieben</h1>
            <p className="text-sm text-muted-foreground">
              Der Vertrag {vermietung.nummer} wurde am{" "}
              {vermietung.signedAt ? formatDate(vermietung.signedAt) : ""} um{" "}
              {vermietung.signedAt ? formatTime(vermietung.signedAt) : ""} Uhr unterschrieben. Der
              Termin ist verbindlich reserviert — du hast eine Kopie per E-Mail erhalten.
            </p>
            {vermietung.contractPdfUrl ? (
              <Button asChild variant="outline">
                <a href={vermietung.contractPdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileDown className="size-4" /> Vertrag als PDF
                </a>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (vermietung.status !== "VERTRAG_GESENDET") {
    return (
      <Shell hausName={hausName}>
        <InfoCard text="Dieser Vertrag ist nicht mehr verfügbar. Bitte wende dich an die Verwaltung." />
      </Shell>
    );
  }

  // Abgelaufener Link: lazy auf ABGELAUFEN setzen
  if (token.usedAt || token.expiresAt < new Date()) {
    if (token.expiresAt < new Date() && !token.usedAt) {
      await prisma.vermietung.updateMany({
        where: { id: vermietung.id, status: "VERTRAG_GESENDET" },
        data: { status: "ABGELAUFEN" },
      });
    }
    return (
      <Shell hausName={hausName}>
        <InfoCard text="Dieser Vertragslink ist abgelaufen. Bitte wende dich an die Verwaltung, um einen neuen Link zu erhalten." />
      </Shell>
    );
  }

  return (
    <Shell hausName={hausName}>
      <div>
        <h1 className="text-2xl font-semibold">Mietvertrag {vermietung.nummer}</h1>
        <p className="text-sm text-muted-foreground">
          Bitte lies den Vertrag und unterschreibe unten digital.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Eckdaten</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Raum: </span>
            {vermietung.raum?.name}
            {vermietung.raum?.etage ? ` (${vermietung.raum.etage.name})` : ""}
          </p>
          <p>
            <span className="text-muted-foreground">Zeitraum: </span>
            {vermietung.startsAt && vermietung.endsAt
              ? formatRange(vermietung.startsAt, vermietung.endsAt)
              : ""}
          </p>
          <p>
            <span className="text-muted-foreground">Zweck: </span>
            {vermietung.purpose}
          </p>
          <p>
            <span className="text-muted-foreground">Preis: </span>
            {vermietung.finalPrice != null ? formatEuro(Number(vermietung.finalPrice)) : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Vertragstext</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[50dvh] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-4 text-sm leading-relaxed">
            {vermietung.contractText}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Digital unterschreiben</CardTitle>
        </CardHeader>
        <CardContent>
          <SignForm rawToken={rawToken} />
        </CardContent>
      </Card>
    </Shell>
  );
}
