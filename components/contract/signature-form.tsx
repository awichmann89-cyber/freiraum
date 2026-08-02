"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function SignatureForm({ token }: { token: string }) {
  const router = useRouter();
  const sigRef = useRef<SignatureCanvas>(null);
  const [signerName, setSignerName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clear() {
    sigRef.current?.clear();
  }

  async function submit() {
    setError(null);

    if (!signerName.trim()) {
      setError("Bitte geben Sie Ihren Namen ein.");
      return;
    }
    if (!accepted) {
      setError("Bitte bestätigen Sie die Kenntnisnahme des Vertrags.");
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("Bitte unterschreiben Sie im markierten Feld.");
      return;
    }

    const signatureDataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");

    setSubmitting(true);
    const res = await fetch(`/api/contracts/sign/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signerName, signatureDataUrl }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Die Signatur konnte nicht gespeichert werden.");
      return;
    }

    router.push(`/vertrag/${token}/abgeschlossen`);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signerName">Ihr vollständiger Name</Label>
        <Input id="signerName" value={signerName} onChange={(e) => setSignerName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label>Unterschrift (mit Maus oder Finger)</Label>
        <div className="rounded-md border bg-white">
          <SignatureCanvas
            ref={sigRef}
            penColor="black"
            canvasProps={{ className: "w-full h-48 touch-none" }}
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Unterschrift löschen
        </Button>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="accept"
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked === true)}
        />
        <Label htmlFor="accept" className="font-normal">
          Ich habe den Vertrag gelesen und stimme den Bedingungen zu.
        </Label>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button onClick={submit} disabled={submitting}>
        {submitting ? "Wird gesendet…" : "Vertrag unterschreiben"}
      </Button>
    </div>
  );
}
