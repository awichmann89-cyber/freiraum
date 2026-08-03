import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Floorplan" };

export default async function EtagenIndexPage() {
  const etagen = await prisma.etage.findMany({
    orderBy: { level: "asc" },
    select: { id: true, floorplanImageUrl: true },
  });

  const mitPlan = etagen.find((e) => e.floorplanImageUrl);
  const ziel = mitPlan ?? etagen[0];
  if (ziel) redirect(`/etagen/${ziel.id}`);

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Floorplan</h1>
      <p className="text-sm text-muted-foreground">Noch keine Etagen angelegt.</p>
    </div>
  );
}
