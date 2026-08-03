import type { Metadata } from "next";
import Link from "next/link";
import { Map, Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmButton } from "@/components/confirm-button";
import { EtageDialog } from "./etage-dialog";
import { deleteEtage } from "./etagen-actions";

export const metadata: Metadata = { title: "Etagen" };

export default async function EtagenPage() {
  const etagen = await prisma.etage.findMany({
    orderBy: { level: "asc" },
    include: { _count: { select: { raeume: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Etagen</h1>
        <EtageDialog
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Neue Etage
            </Button>
          }
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Räume</TableHead>
              <TableHead>Floorplan</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {etagen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Noch keine Etagen angelegt.
                </TableCell>
              </TableRow>
            ) : (
              etagen.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.level}</TableCell>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell>{e._count.raeume}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/etagen/${e.id}/plan`}
                      className="inline-flex items-center gap-1 text-sm underline-offset-2 hover:underline"
                    >
                      <Map className="size-4" />
                      {e.floorplanImageUrl ? "Plan bearbeiten" : "Plan hochladen"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <EtageDialog
                        etage={{ id: e.id, name: e.name, level: e.level }}
                        trigger={
                          <Button variant="ghost" size="icon-sm" title="Bearbeiten">
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <ConfirmButton
                        action={deleteEtage.bind(null, e.id)}
                        confirmText={`Etage "${e.name}" wirklich löschen?`}
                        successText="Etage gelöscht"
                      >
                        <Trash2 className="size-4" />
                      </ConfirmButton>
                    </div>
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
