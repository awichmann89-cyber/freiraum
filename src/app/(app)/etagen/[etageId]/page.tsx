import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parsePoints } from "@/lib/floorplan-geometry";
import { splitIntoBerlinDays } from "@/lib/calendar-time";
import { addDaysISO, berlinInstant, todayISO } from "@/lib/occurrences";
import { FloorplanViewer, type ViewerShape } from "@/components/floorplan/floorplan-viewer";

export const metadata: Metadata = { title: "Floorplan" };

export default async function EtageViewerPage({
  params,
}: {
  params: Promise<{ etageId: string }>;
}) {
  const user = await requireUser();
  const { etageId } = await params;

  const [etagen, etage] = await Promise.all([
    prisma.etage.findMany({
      orderBy: { level: "asc" },
      select: { id: true, name: true, floorplanImageUrl: true },
    }),
    prisma.etage.findUnique({
      where: { id: etageId },
      include: {
        raeume: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, sizeSqm: true, capacity: true },
        },
        formen: true,
      },
    }),
  ]);
  if (!etage) notFound();

  const heute = todayISO();
  const hasPlan = !!(etage.floorplanImageUrl && etage.floorplanImgWidth && etage.floorplanImgHeight);

  let shapes: ViewerShape[] = [];
  if (hasPlan) {
    const raumIds = etage.raeume.map((r) => r.id);
    const dayStart = berlinInstant(heute, "00:00");
    const dayEnd = berlinInstant(addDaysISO(heute, 1), "00:00");
    const now = new Date();

    const buchungen = raumIds.length
      ? await prisma.buchung.findMany({
          where: {
            status: "BESTAETIGT",
            raumId: { in: raumIds },
            startsAt: { lt: dayEnd },
            endsAt: { gt: dayStart },
          },
          include: { gruppe: { select: { name: true } } },
          orderBy: { startsAt: "asc" },
        })
      : [];

    shapes = etage.formen.flatMap((form) => {
      const raum = etage.raeume.find((r) => r.id === form.raumId);
      if (!raum) return [];
      const raumBuchungen = buchungen.filter((b) => b.raumId === raum.id);
      return [
        {
          raumId: raum.id,
          raumName: raum.name,
          points: parsePoints(form.points),
          busyNow: raumBuchungen.some((b) => b.startsAt <= now && now < b.endsAt),
          sizeSqm: raum.sizeSqm?.toString() ?? null,
          capacity: raum.capacity,
          heuteBuchungen: raumBuchungen.flatMap((b) =>
            splitIntoBerlinDays(b.startsAt, b.endsAt)
              .filter((seg) => seg.dateISO === heute)
              .map((seg) => ({
                startMin: seg.startMin,
                endMin: seg.endMin,
                titel: b.titel,
                subtitle: b.art === "GRUPPE" ? (b.gruppe?.name ?? null) : "Vermietung",
              }))
          ),
        },
      ];
    });
  }

  const ohneForm = etage.raeume.filter((r) => !etage.formen.some((f) => f.raumId === r.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Etagen</h1>
        {user.role === "ADMIN" ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/etagen/${etage.id}/plan`}>
              <Pencil className="size-4" /> Plan bearbeiten
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Etagen-Tabs */}
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
          {etagen.map((e) => (
            <Link
              key={e.id}
              href={`/etagen/${e.id}`}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                e.id === etage.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {e.name}
              {!e.floorplanImageUrl ? <span className="ml-1 text-xs">·</span> : null}
            </Link>
          ))}
        </div>
      </div>

      {hasPlan ? (
        <div className="space-y-2">
          <FloorplanViewer
            image={{
              url: etage.floorplanImageUrl!,
              width: etage.floorplanImgWidth!,
              height: etage.floorplanImgHeight!,
            }}
            shapes={shapes}
            dateISO={heute}
          />
          {ohneForm.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Ohne Form auf dem Plan:{" "}
              {ohneForm.map((r, i) => (
                <span key={r.id}>
                  {i > 0 ? ", " : ""}
                  <Link href={`/kalender/raum/${r.id}`} className="underline">
                    {r.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Für diese Etage wurde noch kein Floorplan hochgeladen.
          {user.role === "ADMIN" ? (
            <>
              {" "}
              <Link href={`/admin/etagen/${etage.id}/plan`} className="underline">
                Jetzt hochladen
              </Link>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
