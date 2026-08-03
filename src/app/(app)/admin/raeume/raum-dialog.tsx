"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveRaum } from "./raeume-actions";
import type { ActionResult } from "@/lib/action-result";

export type RaumFormData = {
  id: string;
  name: string;
  etageId: string;
  sizeSqm: string | null;
  capacity: number | null;
  priceHourly: string | null;
  priceDaily: string | null;
};

export function RaumDialog({
  raum,
  etagen,
  trigger,
}: {
  raum?: RaumFormData;
  etagen: { id: string; name: string }[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await saveRaum(raum?.id ?? null, prev, formData);
      if (result && "ok" in result) {
        toast.success("Raum gespeichert");
        setOpen(false);
      }
      return result;
    },
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{raum ? "Raum bearbeiten" : "Neuer Raum"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="raum-name">Name</Label>
            <Input id="raum-name" name="name" defaultValue={raum?.name} placeholder="z.B. Saal" required />
          </div>
          <div className="space-y-2">
            <Label>Etage</Label>
            <Select name="etageId" defaultValue={raum?.etageId} required>
              <SelectTrigger>
                <SelectValue placeholder="Etage wählen" />
              </SelectTrigger>
              <SelectContent>
                {etagen.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="raum-size">Größe (m²)</Label>
              <Input
                id="raum-size"
                name="sizeSqm"
                type="number"
                step="0.1"
                min="0"
                defaultValue={raum?.sizeSqm ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="raum-capacity">Kapazität (Personen)</Label>
              <Input
                id="raum-capacity"
                name="capacity"
                type="number"
                min="0"
                defaultValue={raum?.capacity ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="raum-price-h">Mietpreis / Stunde (€)</Label>
              <Input
                id="raum-price-h"
                name="priceHourly"
                type="number"
                step="0.01"
                min="0"
                defaultValue={raum?.priceHourly ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="raum-price-d">Mietpreis / Tag (€)</Label>
              <Input
                id="raum-price-d"
                name="priceDaily"
                type="number"
                step="0.01"
                min="0"
                defaultValue={raum?.priceDaily ?? ""}
              />
            </div>
          </div>
          {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Speichern…" : "Speichern"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
