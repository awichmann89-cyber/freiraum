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
import { saveEtage } from "./etagen-actions";
import type { ActionResult } from "@/lib/action-result";

export function EtageDialog({
  etage,
  trigger,
}: {
  etage?: { id: string; name: string; level: number };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await saveEtage(etage?.id ?? null, prev, formData);
      if (result && "ok" in result) {
        toast.success("Etage gespeichert");
        setOpen(false);
      }
      return result;
    },
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{etage ? "Etage bearbeiten" : "Neue Etage"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="etage-name">Name</Label>
            <Input
              id="etage-name"
              name="name"
              defaultValue={etage?.name}
              placeholder="z.B. Erdgeschoss"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="etage-level">Level (Sortierung, z.B. -1 = UG, 0 = EG, 1 = 1. OG)</Label>
            <Input
              id="etage-level"
              name="level"
              type="number"
              defaultValue={etage?.level ?? 0}
              required
            />
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
