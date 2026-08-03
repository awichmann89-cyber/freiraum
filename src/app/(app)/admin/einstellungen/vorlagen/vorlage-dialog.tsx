"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveVorlage } from "./vorlagen-actions";
import type { ActionResult } from "@/lib/action-result";

export function VorlageDialog({
  vorlage,
  trigger,
}: {
  vorlage?: { id: string; name: string; body: string; isDefault: boolean };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await saveVorlage(vorlage?.id ?? null, prev, formData);
      if (result && "ok" in result) {
        toast.success("Vorlage gespeichert");
        setOpen(false);
      }
      return result;
    },
    undefined
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vorlage ? "Vorlage bearbeiten" : "Neue Vertragsvorlage"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vorlage-name">Name</Label>
            <Input id="vorlage-name" name="name" defaultValue={vorlage?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vorlage-body">Vertragstext</Label>
            <Textarea
              id="vorlage-body"
              name="body"
              defaultValue={vorlage?.body}
              rows={18}
              required
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Platzhalter wie {"{{name}}"}, {"{{raum}}"}, {"{{zeitraum}}"} oder {"{{preis}}"}{" "}
              werden beim Senden automatisch ersetzt — vollständige Liste unter der Tabelle.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="vorlage-default" name="isDefault" defaultChecked={vorlage?.isDefault} />
            <Label htmlFor="vorlage-default">Als Standardvorlage vorauswählen</Label>
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
