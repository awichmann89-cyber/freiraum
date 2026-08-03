import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/tz";

export const metadata: Metadata = { title: "Meine Anfragen" };

export default async function MeineAnfragenPage() {
  const user = await requireUser();

  if (!user.gruppeId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Anfragen</h1>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Dein Zugang ist keiner Gruppe zugeordnet.
          </CardContent>
        </Card>
      </div>
    );
  }

  const anfragen = await prisma.buchungsAnfrage.findMany({
    where: { gruppeId: user.gruppeId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      createdBy: { select: { name: true } },
      posten: { select: { status: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Anfragen deiner Gruppe</h1>
        <Button asChild size="sm">
          <Link href="/buchen">Neue Anfrage</Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Eingereicht</TableHead>
              <TableHead className="hidden sm:table-cell">Von</TableHead>
              <TableHead>Termine</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anfragen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Noch keine Anfragen — starte mit „Neue Anfrage&ldquo;.
                </TableCell>
              </TableRow>
            ) : (
              anfragen.map((a) => {
                const offen = a.posten.filter((p) => p.status === "ANGEFRAGT").length;
                const bestaetigt = a.posten.filter((p) => p.status === "BESTAETIGT").length;
                const abgelehnt = a.posten.filter((p) => p.status === "ABGELEHNT").length;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link href={`/meine-anfragen/${a.id}`} className="font-medium hover:underline">
                        {formatDate(a.createdAt)}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{a.createdBy.name}</TableCell>
                    <TableCell>{a.posten.length}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {offen > 0 ? <Badge variant="outline">{offen} offen</Badge> : null}
                        {bestaetigt > 0 ? (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                            {bestaetigt} bestätigt
                          </Badge>
                        ) : null}
                        {abgelehnt > 0 ? <Badge variant="destructive">{abgelehnt} abgelehnt</Badge> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
