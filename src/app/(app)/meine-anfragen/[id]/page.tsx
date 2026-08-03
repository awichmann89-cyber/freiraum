import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Repeat } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/tz";
import { postenBeschreibungFromDb } from "@/lib/posten-utils";

export const metadata: Metadata = { title: "Anfrage" };

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "BESTAETIGT":
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Bestätigt</Badge>;
    case "ABGELEHNT":
      return <Badge variant="destructive">Abgelehnt</Badge>;
    default:
      return <Badge variant="outline">Wartet auf Bestätigung</Badge>;
  }
}

export default async function MeineAnfrageDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ neu?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { neu } = await searchParams;

  const anfrage = await prisma.buchungsAnfrage.findUnique({
    where: { id },
    include: {
      gruppe: { select: { name: true } },
      createdBy: { select: { name: true } },
      posten: {
        include: { raum: { select: { name: true } } },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!anfrage) notFound();
  if (user.role !== "ADMIN" && anfrage.gruppeId !== user.gruppeId) notFound();

  return (
    <div className="space-y-4">
      {neu ? (
        <Alert>
          <AlertTitle>Anfrage gesendet</AlertTitle>
          <AlertDescription>
            Die Verwaltung wurde per E-Mail informiert und prüft jeden Termin einzeln. Du bekommst
            das Ergebnis per E-Mail.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/meine-anfragen" aria-label="Zurück">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold leading-tight">
            Anfrage vom {formatDate(anfrage.createdAt)}
          </h1>
          <p className="text-xs text-muted-foreground">
            {anfrage.gruppe.name} · eingereicht von {anfrage.createdBy.name}
          </p>
        </div>
      </div>

      {anfrage.notiz ? <p className="rounded-md bg-muted p-2 text-sm">{anfrage.notiz}</p> : null}

      <div className="space-y-3">
        {anfrage.posten.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                {p.art === "WOECHENTLICH" ? <Repeat className="size-4" /> : null}
                {p.titel}
                <StatusBadge status={p.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {p.raum.name} · {postenBeschreibungFromDb(p)}
              {p.status === "ABGELEHNT" && p.rejectReason ? (
                <p className="mt-1">Begründung: {p.rejectReason}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
