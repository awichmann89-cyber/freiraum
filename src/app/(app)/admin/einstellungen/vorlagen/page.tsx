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
import { PLACEHOLDER_DOKU } from "@/lib/contract";
import { VorlageDialog } from "./vorlage-dialog";
import { createDefaultVorlage, deleteVorlage } from "./vorlagen-actions";

export const metadata: Metadata = { title: "Vertragsvorlagen" };

export default async function VorlagenPage() {
  const vorlagen = await prisma.vertragsvorlage.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Vertragsvorlagen</h1>
        <div className="flex gap-2">
          {vorlagen.length === 0 ? (
            <ConfirmButton
              action={createDefaultVorlage}
              confirmText="Mitgelieferte Standardvorlage anlegen? Du kannst sie danach frei anpassen."
              variant="outline"
              successText="Standardvorlage angelegt"
            >
              Standardvorlage anlegen
            </ConfirmButton>
          ) : null}
          <VorlageDialog
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Neue Vorlage
              </Button>
            }
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Standard</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vorlagen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Noch keine Vorlagen — ohne Vorlage kann kein Vertrag versendet werden.
                </TableCell>
              </TableRow>
            ) : (
              vorlagen.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>
                    {v.isDefault ? <Badge variant="secondary">Standard</Badge> : "–"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <VorlageDialog
                        vorlage={{ id: v.id, name: v.name, body: v.body, isDefault: v.isDefault }}
                        trigger={
                          <Button variant="ghost" size="icon-sm" title="Bearbeiten">
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
                      <ConfirmButton
                        action={deleteVorlage.bind(null, v.id)}
                        confirmText={`Vorlage "${v.name}" löschen? Bereits versendete Verträge bleiben unverändert.`}
                        successText="Vorlage gelöscht"
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

      <div className="rounded-lg border p-4">
        <h2 className="mb-2 text-sm font-medium">Verfügbare Platzhalter</h2>
        <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {PLACEHOLDER_DOKU.map((p) => (
            <div key={p.key} className="flex gap-2">
              <code className="shrink-0 rounded bg-muted px-1 text-xs">{`{{${p.key}}}`}</code>
              <span className="text-muted-foreground">{p.beschreibung}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
