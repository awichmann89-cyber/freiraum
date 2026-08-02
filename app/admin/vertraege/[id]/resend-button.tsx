"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ResendButton({ contractId }: { contractId: string }) {
  const [pending, setPending] = useState(false);

  async function resend() {
    setPending(true);
    const res = await fetch(`/api/contracts/${contractId}/resend`, { method: "POST" });
    setPending(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Erneutes Senden fehlgeschlagen.");
      return;
    }
    toast.success("Unterschrifts-Link erneut versendet.");
  }

  return (
    <Button variant="outline" disabled={pending} onClick={resend}>
      {pending ? "Wird gesendet…" : "Link erneut senden"}
    </Button>
  );
}
