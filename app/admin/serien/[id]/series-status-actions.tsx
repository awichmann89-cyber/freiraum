"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { BookingSeries } from "@/lib/db/types";
import { Button } from "@/components/ui/button";

export function SeriesStatusActions({ series }: { series: BookingSeries }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function patch(status: "approved" | "rejected" | "cancelled") {
    setPending(true);
    const res = await fetch(`/api/series/${series.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Aktion fehlgeschlagen.");
      return;
    }
    toast.success(
      status === "approved" ? "Serie freigegeben, Termine wurden angelegt." : "Gespeichert."
    );
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {series.status === "requested" ? (
        <>
          <Button disabled={pending} onClick={() => patch("approved")}>
            Serie freigeben
          </Button>
          <Button variant="destructive" disabled={pending} onClick={() => patch("rejected")}>
            Ablehnen
          </Button>
        </>
      ) : null}
      {series.status === "approved" ? (
        <Button variant="outline" disabled={pending} onClick={() => patch("cancelled")}>
          Serie stornieren
        </Button>
      ) : null}
      {series.type === "external_rental" && series.status === "approved" ? (
        <Button render={<Link href={`/admin/vertraege/neu-serie/${series.id}`} />}>
          Vertrag erstellen
        </Button>
      ) : null}
    </div>
  );
}
