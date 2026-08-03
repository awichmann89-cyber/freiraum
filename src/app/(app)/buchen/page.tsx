import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Card, CardContent } from "@/components/ui/card";
import { BuchenWizard } from "./buchen-wizard";
import { AnfragenListe } from "./anfragen-liste";

export const metadata: Metadata = { title: "Buchen" };

function plusMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default async function BuchenPage({
  searchParams,
}: {
  searchParams: Promise<{ raumId?: string; datum?: string; start?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  if (!user.gruppeId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Buchen</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Dein Zugang ist keiner Gruppe zugeordnet — Buchungsanfragen können nur von
            Gruppen-Zugängen gestellt werden.
          </CardContent>
        </Card>
      </div>
    );
  }

  const raeume = await prisma.raum.findMany({
    where: { isActive: true },
    orderBy: [{ etage: { level: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, etage: { select: { name: true } } },
  });

  const start = /^\d{2}:\d{2}$/.test(sp.start ?? "") ? sp.start : undefined;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">Buchungsanfrage stellen</h1>
        <BuchenWizard
          raeume={raeume.map((r) => ({ id: r.id, name: r.name, etageName: r.etage.name }))}
          prefill={{
            raumId: sp.raumId,
            date: /^\d{4}-\d{2}-\d{2}$/.test(sp.datum ?? "") ? sp.datum : undefined,
            start,
            end: start ? plusMinutes(start, 120) : undefined,
          }}
        />
      </section>
      <AnfragenListe gruppeId={user.gruppeId} />
    </div>
  );
}
