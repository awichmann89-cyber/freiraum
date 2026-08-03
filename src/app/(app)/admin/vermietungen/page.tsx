import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRange } from "@/lib/tz";
import { ClickableRow } from "@/components/clickable-row";
import { VermietungStatusBadge } from "./vermietung-status-badge";

export const metadata: Metadata = { title: "Vermietungen" };

export default async function VermietungenPage() {
  const vermietungen = await prisma.vermietung.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { raum: { select: { name: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Vermietungen</h1>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nummer</TableHead>
              <TableHead>Kontakt</TableHead>
              <TableHead className="hidden md:table-cell">Raum</TableHead>
              <TableHead className="hidden sm:table-cell">Zeitraum</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vermietungen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Noch keine Mietanfragen.
                </TableCell>
              </TableRow>
            ) : (
              vermietungen.map((v) => (
                <ClickableRow key={v.id} href={`/admin/vermietungen/${v.id}`}>
                  <TableCell>
                    <Link href={`/admin/vermietungen/${v.id}`} className="font-medium hover:underline">
                      {v.nummer}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {v.contactName}
                    {v.organization ? (
                      <span className="block text-xs text-muted-foreground">{v.organization}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{v.raum?.name ?? "–"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatRange(v.startsAt ?? v.requestedStart, v.endsAt ?? v.requestedEnd)}
                  </TableCell>
                  <TableCell>
                    <VermietungStatusBadge status={v.status} />
                  </TableCell>
                </ClickableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
