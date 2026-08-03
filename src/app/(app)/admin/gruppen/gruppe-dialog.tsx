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
import { Textarea } from "@/components/ui/textarea";
import { saveGruppe } from "./gruppen-actions";
import type { ActionResult } from "@/lib/action-result";

export function GruppeDialog({
  gruppe,
  trigger,
}: {
  gruppe?: { id: string; name: string; color: string; notiz: string | null };
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await saveGruppe(gruppe?.id ?? null, prev, formData);
      if (result && "ok" in result) {
        toast.success("Gruppe gespeichert");
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
          <DialogTitle>{gruppe ? "Gruppe bearbeiten" : "Neue Gruppe"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gruppe-name">Name</Label>
            <Input id="gruppe-name" name="name" defaultValue={gruppe?.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gruppe-color">Kalenderfarbe</Label>
            <Input
              id="gruppe-color"
              name="color"
              type="color"
              defaultValue={gruppe?.color ?? "#64748b"}
              className="h-10 w-20 p-1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gruppe-notiz">Notiz (optional)</Label>
            <Textarea id="gruppe-notiz" name="notiz" defaultValue={gruppe?.notiz ?? ""} rows={3} />
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
