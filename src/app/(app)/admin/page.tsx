import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboardPage() {
  const [offenePosten, offeneAnfragen, neueVermietungen, gruppen, raeume] = await Promise.all([
    prisma.anfragePosten.count({ where: { status: "ANGEFRAGT" } }),
    prisma.buchungsAnfrage.count({ where: { completedAt: null } }),
    prisma.vermietung.count({ where: { status: "NEU" } }),
    prisma.gruppe.count({ where: { isActive: true } }),
    prisma.raum.count({ where: { isActive: true } }),
  ]);

  const cards = [
    {
      href: "/admin/anfragen",
      title: "Offene Buchungsanfragen",
      value: offeneAnfragen,
      description: `${offenePosten} unentschiedene${offenePosten === 1 ? "r" : ""} Termin${offenePosten === 1 ? "" : "e"}`,
    },
    {
      href: "/admin/vermietungen",
      title: "Neue Mietanfragen",
      value: neueVermietungen,
      description: "Warten auf Prüfung",
    },
    {
      href: "/admin/gruppen",
      title: "Aktive Gruppen",
      value: gruppen,
      description: "Gruppen mit Zugang",
    },
    {
      href: "/admin/raeume",
      title: "Aktive Räume",
      value: raeume,
      description: "Buchbare Räume",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Link key={c.href} href={c.href}>
          <Card className="transition-colors hover:bg-accent/50">
            <CardHeader className="pb-2">
              <CardDescription>{c.title}</CardDescription>
              <CardTitle className="text-3xl">{c.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{c.description}</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
