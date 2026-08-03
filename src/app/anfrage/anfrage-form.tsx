"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { submitMietanfrage } from "./anfrage-actions";
import type { ActionResult } from "@/lib/action-result";

export function AnfrageForm({
  raeume,
}: {
  raeume: { id: string; name: string; etageName: string; sizeSqm: string | null; capacity: number | null }[];
}) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    submitMietanfrage,
    undefined
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mf-name">Name *</Label>
          <Input id="mf-name" name="contactName" required autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf-email">E-Mail *</Label>
          <Input id="mf-email" name="contactEmail" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf-phone">Telefon</Label>
          <Input id="mf-phone" name="contactPhone" type="tel" autoComplete="tel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf-org">Organisation / Verein</Label>
          <Input id="mf-org" name="organization" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Gewünschter Raum</Label>
        <Select name="raumId" defaultValue="unklar">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unklar">Noch unklar — bitte beraten</SelectItem>
            {raeume.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name} · {r.etageName}
                {r.sizeSqm ? ` · ${r.sizeSqm} m²` : ""}
                {r.capacity ? ` · bis ${r.capacity} Pers.` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="mf-start-date">Datum von *</Label>
          <Input
            id="mf-start-date"
            name="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => {
              const v = e.target.value;
              setStartDate(v);
              if (!endDate || endDate < v) setEndDate(v);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf-start">Uhrzeit von *</Label>
          <Input id="mf-start" name="startTime" type="time" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf-end-date">Datum bis *</Label>
          <Input
            id="mf-end-date"
            name="endDate"
            type="date"
            required
            min={startDate || undefined}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf-end">Uhrzeit bis *</Label>
          <Input id="mf-end" name="endTime" type="time" required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mf-purpose">Zweck der Veranstaltung *</Label>
        <Input id="mf-purpose" name="purpose" required placeholder="z.B. Geburtstagsfeier, Seminar" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mf-message">Nachricht (optional)</Label>
        <Textarea id="mf-message" name="message" rows={3} />
      </div>

      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Wird gesendet…" : "Anfrage senden"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Wir prüfen die Verfügbarkeit und melden uns per E-Mail. Die Anfrage ist unverbindlich.
      </p>
    </form>
  );
}
