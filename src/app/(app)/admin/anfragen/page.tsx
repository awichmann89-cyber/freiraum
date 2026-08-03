import type { Metadata } from "next";
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

export const metadata: Metadata = { title: "Buchungsanfragen" };

export default async function AdminAnfragenPage() {
  const anfragen = await prisma.buchungsAnfrage.findMany({
    orderBy: [{ completedAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
    include: {
      gruppe: { select: { name: true, color: true } },
      createdBy: { select: { name: true } },
      posten: { select: { status: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Buchungsanfragen</h1>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gruppe</TableHead>
              <TableHead className="hidden sm:table-cell">Eingegangen</TableHead>
              <TableHead>Termine</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {anfragen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Noch keine Anfragen.
                </TableCell>
              </TableRow>
            ) : (
              anfragen.map((a) => {
                const offen = a.posten.filter((p) => p.status === "ANGEFRAGT").length;
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Link
                        href={`/admin/anfragen/${a.id}`}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <span
                          className="inline-block size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: a.gruppe.color }}
                        />
                        {a.gruppe.name}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({a.createdBy.name})
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{formatDate(a.createdAt)}</TableCell>
                    <TableCell>{a.posten.length}</TableCell>
                    <TableCell>
                      {offen > 0 ? (
                        <Badge>
                          {offen} offen
                        </Badge>
                      ) : (
                        <Badge variant="secondary">erledigt</Badge>
                      )}
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
