"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/action-result";

export function SetPasswordForm({
  action,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(action, undefined);

  if (state && "ok" in state) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm">Dein Passwort wurde gespeichert. Du kannst dich jetzt anmelden.</p>
        <Button asChild className="w-full">
          <Link href="/login">Zur Anmeldung</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Neues Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordConfirm">Passwort wiederholen</Label>
        <Input
          id="passwordConfirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Speichern…" : "Passwort speichern"}
      </Button>
    </form>
  );
}
