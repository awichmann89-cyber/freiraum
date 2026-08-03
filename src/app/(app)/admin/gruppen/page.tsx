import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GruppeDialog } from "./gruppe-dialog";

export const metadata: Metadata = { title: "Gruppen" };

export default async function GruppenPage() {
  const gruppen = await prisma.gruppe.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true, buchungen: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gruppen</h1>
        <GruppeDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Neue Gruppe
            </Button>
          }
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Zugänge</TableHead>
              <TableHead className="hidden sm:table-cell">Buchungen</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gruppen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Noch keine Gruppen angelegt.
                </TableCell>
              </TableRow>
            ) : (
              gruppen.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <Link href={`/admin/gruppen/${g.id}`} className="flex items-center gap-2 font-medium hover:underline">
                      <span
                        className="inline-block size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: g.color }}
                      />
                      {g.name}
                    </Link>
                  </TableCell>
                  <TableCell>{g._count.users}</TableCell>
                  <TableCell className="hidden sm:table-cell">{g._count.buchungen}</TableCell>
                  <TableCell>
                    {g.isActive ? (
                      <Badge variant="secondary">aktiv</Badge>
                    ) : (
                      <Badge variant="outline">inaktiv</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
