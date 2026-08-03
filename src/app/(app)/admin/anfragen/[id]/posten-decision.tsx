"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { decidePosten } from "./anfragen-actions";

export function PostenDecision({ postenId }: { postenId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const confirm = (force: boolean) => {
    startTransition(async () => {
      const result = await decidePosten(postenId, { decision: "BESTAETIGEN", force });
      if ("needsForce" in result) {
        if (window.confirm(`${result.message}\n\nTrotzdem bestätigen?`)) {
          const forced = await decidePosten(postenId, { decision: "BESTAETIGEN", force: true });
          if ("error" in forced) toast.error(forced.error);
          else if ("ok" in forced) {
            toast.success("Termin bestätigt");
            router.refresh();
          }
        }
        return;
      }
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Termin bestätigt");
        router.refresh();
      }
    });
  };

  const reject = () => {
    startTransition(async () => {
      const result = await decidePosten(postenId, {
        decision: "ABLEHNEN",
        rejectReason: rejectReason || undefined,
      });
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Termin abgelehnt");
        setRejectOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => confirm(false)} disabled={isPending}>
        <Check className="size-4" /> Bestätigen
      </Button>
      <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)} disabled={isPending}>
        <X className="size-4" /> Ablehnen
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Termin ablehnen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Begründung (optional, wird der Gruppe mitgeteilt)</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
            <Button variant="destructive" className="w-full" onClick={reject} disabled={isPending}>
              {isPending ? "Ablehnen…" : "Ablehnen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
