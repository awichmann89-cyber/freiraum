import type { Metadata } from "next";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { ConfirmButton } from "@/components/confirm-button";
import { RaumDialog } from "./raum-dialog";
import { deleteRaum, setRaumActive } from "./raeume-actions";

export const metadata: Metadata = { title: "Räume" };

export default async function RaeumePage() {
  const [etagen, raeume] = await Promise.all([
    prisma.etage.findMany({ orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.raum.findMany({
      orderBy: [{ etage: { level: "asc" } }, { name: "asc" }],
      include: { etage: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Räume</h1>
        <RaumDialog
          etagen={etagen}
          trigger={
            <Button size="sm" disabled={etagen.length === 0}>
              <Plus className="size-4" /> Neuer Raum
            </Button>
          }
        />
      </div>

      {etagen.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Lege zuerst mindestens eine Etage an, bevor du Räume erstellst.
        </p>
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Etage</TableHead>
              <TableHead className="hidden sm:table-cell">Größe</TableHead>
              <TableHead className="hidden sm:table-cell">Kapazität</TableHead>
              <TableHead className="hidden md:table-cell">€/Std.</TableHead>
              <TableHead className="hidden md:table-cell">€/Tag</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {raeume.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Noch keine Räume angelegt.
                </TableCell>
              </TableRow>
            ) : (
              raeume.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.etage.name}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {r.sizeSqm ? `${r.sizeSqm.toString()} m²` : "–"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{r.capacity ?? "–"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {r.priceHourly ? `${r.priceHourly.toString()} €` : "–"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {r.priceDaily ? `${r.priceDaily.toString()} €` : "–"}
                  </TableCell>
                  <TableCell>
                    {r.isActive ? (
                      <Badge variant="secondary">aktiv</Badge>
                    ) : (
                      <Badge variant="outline">inaktiv</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <RaumDialog
                        etagen={etagen}
                        raum={{
                          id: r.id,
                          name: r.name,
                          etageId: r.etageId,
                          sizeSqm: r.sizeSqm?.toString() ?? null,
                          capacity: r.capacity,
                          priceHourly: r.priceHourly?.toString() ?? null,
                          priceDaily: r.priceDaily?.toString() ?? null,
                        }}
                        trigger={
                          <Button variant="ghost" size="icon-sm" title="Bearbeiten">
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <ConfirmButton
                        action={setRaumActive.bind(null, r.id, !r.isActive)}
                        confirmText={
                          r.isActive
                            ? `Raum "${r.name}" deaktivieren? Er kann dann nicht mehr gebucht werden.`
                            : `Raum "${r.name}" wieder aktivieren?`
                        }
                        successText={r.isActive ? "Raum deaktiviert" : "Raum aktiviert"}
                      >
                        {r.isActive ? "Deaktivieren" : "Aktivieren"}
                      </ConfirmButton>
                      <ConfirmButton
                        action={deleteRaum.bind(null, r.id)}
                        confirmText={`Raum "${r.name}" wirklich löschen?`}
                        successText="Raum gelöscht"
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
