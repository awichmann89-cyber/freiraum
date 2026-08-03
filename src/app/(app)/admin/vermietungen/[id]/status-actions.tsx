"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { declineVermietung, stornoVermietung } from "./vermietung-actions";

export function DeclineButton({ vermietungId }: { vermietungId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [grund, setGrund] = useState("");
  const [mailSenden, setMailSenden] = useState(true);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await declineVermietung(vermietungId, { grund: grund || undefined, mailSenden });
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Anfrage abgelehnt");
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <X className="size-4" /> Ablehnen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mietanfrage ablehnen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="decline-grund">Begründung (optional)</Label>
            <Textarea id="decline-grund" value={grund} onChange={(e) => setGrund(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="decline-mail"
              checked={mailSenden}
              onCheckedChange={(v) => setMailSenden(v === true)}
            />
            <Label htmlFor="decline-mail" className="font-normal">
              Absage-Mail an Anfragende:n senden
            </Label>
          </div>
          <Button variant="destructive" className="w-full" onClick={submit} disabled={isPending}>
            {isPending ? "Ablehnen…" : "Ablehnen"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StornoButton({ vermietungId }: { vermietungId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (
      !window.confirm(
        "Vermietung wirklich stornieren? Die geblockten Termine werden freigegeben und die Mieterin / der Mieter wird per Mail informiert."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await stornoVermietung(vermietungId);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Vermietung storniert");
      router.refresh();
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={submit} disabled={isPending}>
      <Ban className="size-4" /> {isPending ? "Stornieren…" : "Stornieren"}
    </Button>
  );
}
