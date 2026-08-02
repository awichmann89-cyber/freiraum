"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Booking } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BookingStatusActions({ booking }: { booking: Booking }) {
  const router = useRouter();
  const [adminNotes, setAdminNotes] = useState(booking.adminNotes ?? "");
  const [pending, setPending] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Aktion fehlgeschlagen.");
      return;
    }
    toast.success("Gespeichert.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(booking.status === "requested" || booking.status === "in_review") && (
          <>
            {booking.status === "requested" ? (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => patch({ status: "in_review" })}
              >
                In Prüfung nehmen
              </Button>
            ) : null}
            <Button disabled={pending} onClick={() => patch({ status: "approved" })}>
              Freigeben
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => patch({ status: "rejected" })}
            >
              Ablehnen
            </Button>
          </>
        )}
        {["approved", "contract_sent", "confirmed"].includes(booking.status) ? (
          <Button variant="outline" disabled={pending} onClick={() => patch({ status: "cancelled" })}>
            Stornieren
          </Button>
        ) : null}
        {booking.type === "external_rental" && booking.status === "approved" ? (
          <Button render={<Link href={`/admin/vertraege/neu/${booking.id}`} />}>
            Vertrag erstellen
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminNotes">Interne Notizen (nicht sichtbar für Anfragende:n)</Label>
        <Textarea
          id="adminNotes"
          rows={3}
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => patch({ adminNotes })}
        >
          Notizen speichern
        </Button>
      </div>
    </div>
  );
}
