import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnfrageForm } from "./anfrage-form";

export const metadata: Metadata = { title: "Raum anfragen" };

// Raumliste kommt aus der DB — nicht zur Build-Zeit vorrendern.
export const dynamic = "force-dynamic";

export default async function AnfragePage() {
  const raeume = await prisma.raum.findMany({
    where: { isActive: true },
    orderBy: [{ etage: { level: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sizeSqm: true,
      capacity: true,
      etage: { select: { name: true } },
    },
  });

  return (
    <div className="min-h-dvh">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">Freiraum</span>
          <Button size="sm" variant="ghost" asChild>
            <Link href="/belegung">Belegung ansehen</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Raum mieten — Anfrage</CardTitle>
            <CardDescription>
              Du möchtest einen Raum für eine Veranstaltung mieten? Schick uns eine unverbindliche
              Anfrage — unter{" "}
              <Link href="/belegung" className="underline">
                Aktuelle Belegung
              </Link>{" "}
              siehst du vorab, wann die Räume frei sind.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnfrageForm
              raeume={raeume.map((r) => ({
                id: r.id,
                name: r.name,
                etageName: r.etage.name,
                sizeSqm: r.sizeSqm?.toString() ?? null,
                capacity: r.capacity,
              }))}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
