"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUser } from "../gruppen-actions";
import type { ActionResult } from "@/lib/action-result";

export function InviteForm({ gruppeId }: { gruppeId: string }) {
  const action = inviteUser.bind(null, gruppeId);
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "ok" in state) {
      toast.success("Einladung verschickt");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="invite-name">Name</Label>
        <Input id="invite-name" name="name" required placeholder="Vor- und Nachname" />
      </div>
      <div className="flex-1 space-y-2">
        <Label htmlFor="invite-email">E-Mail</Label>
        <Input id="invite-email" name="email" type="email" required placeholder="name@beispiel.de" />
      </div>
      <div className="flex flex-col gap-1">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Einladen…" : "Einladen"}
        </Button>
      </div>
      {state && "error" in state ? (
        <p className="text-sm text-destructive sm:self-center">{state.error}</p>
      ) : null}
    </form>
  );
}
