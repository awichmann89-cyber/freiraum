"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignaturePad } from "./signature-pad";
import { signVertrag } from "./vertrag-actions";

export function SignForm({ rawToken }: { rawToken: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [agb, setAgb] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    if (!signature) {
      setError("Bitte zuerst im Feld unterschreiben.");
      return;
    }
    startTransition(async () => {
      const result = await signVertrag(rawToken, {
        name,
        agb,
        signatureDataUrl: signature,
      });
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      toast.success("Vertrag unterschrieben");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sign-name">Vor- und Nachname</Label>
        <Input
          id="sign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="Wie im Vertrag angegeben"
          required
        />
      </div>

      <SignaturePad onChange={setSignature} />

      <div className="flex items-start gap-2">
        <Checkbox
          id="sign-agb"
          checked={agb}
          onCheckedChange={(v) => setAgb(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="sign-agb" className="text-sm font-normal leading-snug">
          Ich habe den Vertrag gelesen und stimme den Bedingungen verbindlich zu. Die elektronische
          Unterschrift gilt als rechtsverbindliche Zustimmung.
        </Label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        onClick={submit}
        disabled={isPending || !agb || !signature || name.trim().length < 2}
        className="w-full"
      >
        {isPending ? "Wird übermittelt…" : "Verbindlich unterschreiben"}
      </Button>
    </div>
  );
}
