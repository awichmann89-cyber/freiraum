import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/tz";

export async function AnfragenListe({ gruppeId }: { gruppeId: string }) {
  const anfragen = await prisma.buchungsAnfrage.findMany({
    where: { gruppeId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      createdBy: { select: { name: true } },
      posten: { select: { status: true } },
    },
  });

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Anfragen deiner Gruppe</h2>
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
                  Noch keine Anfragen — stelle oben deine erste Buchungsanfrage.
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
                      <Link
                        href={`/buchen/anfragen/${a.id}`}
                        className="font-medium hover:underline"
                      >
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
                        {abgelehnt > 0 ? (
                          <Badge variant="destructive">{abgelehnt} abgelehnt</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
