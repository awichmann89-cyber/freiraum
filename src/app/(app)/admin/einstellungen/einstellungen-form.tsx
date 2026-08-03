"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettings } from "./einstellungen-actions";
import type { ActionResult } from "@/lib/action-result";

export function EinstellungenForm({
  values,
}: {
  values: { hausName: string; contractTokenDays: string };
}) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    saveSettings,
    undefined
  );

  useEffect(() => {
    if (state && "ok" in state) toast.success("Einstellungen gespeichert");
  }, [state]);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hausName">Name des Hauses</Label>
        <Input id="hausName" name="hausName" defaultValue={values.hausName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contractTokenDays">Gültigkeit von Vertrags-Links (Tage)</Label>
        <Input
          id="contractTokenDays"
          name="contractTokenDays"
          type="number"
          min="1"
          max="365"
          defaultValue={values.contractTokenDays}
        />
      </div>
      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Speichern…" : "Speichern"}
      </Button>
    </form>
  );
}
