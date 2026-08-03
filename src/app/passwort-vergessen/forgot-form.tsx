"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/actions/password-actions";
import type { ActionResult } from "@/lib/action-result";

export function ForgotForm() {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    requestPasswordReset,
    undefined
  );

  if (state && "ok" in state) {
    return (
      <p className="text-sm">
        Falls ein Zugang mit dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen
        geschickt. Bitte prüfe dein Postfach.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" required placeholder="name@beispiel.de" />
      </div>
      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Senden…" : "Link anfordern"}
      </Button>
    </form>
  );
}
