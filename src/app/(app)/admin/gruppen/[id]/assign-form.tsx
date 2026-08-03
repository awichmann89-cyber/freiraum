"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignUserToGruppe } from "../gruppen-actions";
import type { ActionResult } from "@/lib/action-result";

export type ZuordnungsKandidat = {
  id: string;
  name: string;
  email: string;
  gruppeName: string | null;
};

export function AssignForm({
  gruppeId,
  kandidaten,
}: {
  gruppeId: string;
  kandidaten: ZuordnungsKandidat[];
}) {
  const [userId, setUserId] = useState("");
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    async (_prev, formData) => {
      const result = await assignUserToGruppe(gruppeId, _prev, formData);
      if (result && "ok" in result) {
        toast.success("Zugang zugeordnet");
        setUserId("");
      }
      return result;
    },
    undefined
  );

  if (kandidaten.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Keine weiteren Zugänge vorhanden, die zugeordnet werden könnten.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <Label htmlFor="assign-user">Zugang</Label>
        <Select name="userId" value={userId} onValueChange={setUserId} required>
          <SelectTrigger id="assign-user" className="w-full">
            <SelectValue placeholder="Zugang wählen…" />
          </SelectTrigger>
          <SelectContent>
            {kandidaten.map((k) => (
              <SelectItem key={k.id} value={k.id}>
                {k.name} ({k.gruppeName ?? "ohne Gruppe"}){" "}
                <span className="text-muted-foreground">{k.email}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Button type="submit" disabled={isPending || !userId}>
          {isPending ? "Zuordnen…" : "Zuordnen"}
        </Button>
      </div>
      {state && "error" in state ? (
        <p className="text-sm text-destructive sm:self-center">{state.error}</p>
      ) : null}
    </form>
  );
}
