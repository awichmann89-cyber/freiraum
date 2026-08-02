"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CreateContractForm({
  bookingId,
  seriesId,
  renterName,
  roomNames,
  scheduleLabel,
}: {
  bookingId?: string;
  seriesId?: string;
  renterName: string;
  roomNames: string[];
  scheduleLabel: string;
}) {
  const router = useRouter();
  const [priceNote, setPriceNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, seriesId, priceNote: priceNote || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(typeof data?.error === "string" ? data.error : "Vertrag konnte nicht erstellt werden.");
      return;
    }
    const data = await res.json();
    toast.success("Vertrag erstellt und Unterschrifts-Link versendet.");
    router.push(`/admin/vertraege/${data.id}`);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-sm">
        <p>
          <strong>Mieter:in:</strong> {renterName}
        </p>
        <p>
          <strong>Räume:</strong> {roomNames.join(", ")}
        </p>
        <p>
          <strong>Zeitraum:</strong> {scheduleLabel}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="priceNote">Preis / Konditionen (erscheint im Vertrag)</Label>
        <Textarea
          id="priceNote"
          rows={4}
          value={priceNote}
          onChange={(e) => setPriceNote(e.target.value)}
          placeholder="z. B. 150 € Nutzungsgebühr, zahlbar per Überweisung binnen 14 Tagen."
        />
      </div>
      <Button onClick={submit} disabled={submitting}>
        {submitting ? "Wird erstellt…" : "Vertrag erstellen und senden"}
      </Button>
    </div>
  );
}
