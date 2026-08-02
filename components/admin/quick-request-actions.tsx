"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function useQuickPatch(endpoint: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    const res = await fetch(endpoint, {
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

  return { patch, pending };
}

export function QuickBookingActions({ id }: { id: string }) {
  const { patch, pending } = useQuickPatch(`/api/bookings/${id}`);

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => patch({ status: "approved" })}>
        Freigeben
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => patch({ status: "rejected" })}
      >
        Ablehnen
      </Button>
    </div>
  );
}

export function QuickSeriesActions({ id }: { id: string }) {
  const { patch, pending } = useQuickPatch(`/api/series/${id}`);

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => patch({ status: "approved" })}>
        Freigeben
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => patch({ status: "rejected" })}
      >
        Ablehnen
      </Button>
    </div>
  );
}
