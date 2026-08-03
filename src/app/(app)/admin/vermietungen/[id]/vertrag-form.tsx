"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { toast } from "sonner";
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
import { computeFinalPrice, formatEuro, suggestBasePrice } from "@/lib/contract";
import { berlinInstant } from "@/lib/occurrences";
import { sendVertrag } from "./vermietung-actions";

export type VertragFormRaum = {
  id: string;
  name: string;
  etageName: string;
  priceHourly: number | null;
  priceDaily: number | null;
};

export type VertragFormDefaults = {
  raumId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  priceType: "STUNDE" | "TAG";
  basePrice: string;
  discountPercent: string;
  vorlageId: string;
  adminNote: string;
};

export function VertragForm({
  vermietungId,
  raeume,
  vorlagen,
  defaults,
  resend,
}: {
  vermietungId: string;
  raeume: VertragFormRaum[];
  vorlagen: { id: string; name: string }[];
  defaults: VertragFormDefaults;
  resend: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [raumId, setRaumId] = useState(defaults.raumId);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [startTime, setStartTime] = useState(defaults.startTime);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [endTime, setEndTime] = useState(defaults.endTime);
  const [priceType, setPriceType] = useState<"STUNDE" | "TAG">(defaults.priceType);
  const [basePrice, setBasePrice] = useState(defaults.basePrice);
  const [discountPercent, setDiscountPercent] = useState(defaults.discountPercent);
  const [vorlageId, setVorlageId] = useState(defaults.vorlageId);
  const [adminNote, setAdminNote] = useState(defaults.adminNote);

  const suggestion = useMemo(() => {
    const raum = raeume.find((r) => r.id === raumId);
    if (!raum || !startDate || !startTime || !endDate || !endTime) return null;
    try {
      return suggestBasePrice({
        priceType,
        priceHourly: raum.priceHourly,
        priceDaily: raum.priceDaily,
        start: berlinInstant(startDate, startTime),
        end: berlinInstant(endDate, endTime),
      });
    } catch {
      return null;
    }
  }, [raeume, raumId, startDate, startTime, endDate, endTime, priceType]);

  const finalPrice = useMemo(() => {
    const base = parseFloat(basePrice.replace(",", "."));
    const disc = parseFloat(discountPercent.replace(",", ".")) || 0;
    if (Number.isNaN(base)) return null;
    return computeFinalPrice(base, disc);
  }, [basePrice, discountPercent]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await sendVertrag(vermietungId, {
        raumId,
        startDate,
        startTime,
        endDate,
        endTime,
        priceType,
        basePrice: basePrice.replace(",", "."),
        discountPercent: discountPercent.replace(",", ".") || "0",
        vorlageId,
        adminNote: adminNote || undefined,
      });
      if (result && "error" in result) {
        setError(result.error);
        return;
      }
      toast.success(resend ? "Vertrag erneut versendet" : "Vertrag versendet");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Raum</Label>
          <Select value={raumId} onValueChange={setRaumId}>
            <SelectTrigger>
              <SelectValue placeholder="Raum wählen" />
            </SelectTrigger>
            <SelectContent>
              {raeume.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} · {r.etageName}
                  {r.priceHourly != null ? ` · ${formatEuro(r.priceHourly)}/Std.` : ""}
                  {r.priceDaily != null ? ` · ${formatEuro(r.priceDaily)}/Tag` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vf-start-date">Beginn</Label>
          <div className="flex gap-2">
            <Input id="vf-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-28" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vf-end-date">Ende</Label>
          <div className="flex gap-2">
            <Input id="vf-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-28" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Abrechnung</Label>
          <Select value={priceType} onValueChange={(v) => setPriceType(v as "STUNDE" | "TAG")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STUNDE">pro Stunde</SelectItem>
              <SelectItem value="TAG">pro Tag</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vf-base">Basispreis (€)</Label>
          <Input
            id="vf-base"
            inputMode="decimal"
            value={basePrice}
            onChange={(e) => setBasePrice(e.target.value)}
            placeholder="0,00"
          />
          {suggestion != null ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setBasePrice(String(suggestion).replace(".", ","))}
            >
              Vorschlag aus Raumpreis: {formatEuro(suggestion)} übernehmen
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vf-discount">Rabatt (%)</Label>
          <Input
            id="vf-discount"
            inputMode="decimal"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="space-y-2">
          <Label>Endpreis</Label>
          <p className="flex h-9 items-center text-sm font-semibold">
            {finalPrice != null ? formatEuro(finalPrice) : "–"}
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Vertragsvorlage</Label>
          <Select value={vorlageId} onValueChange={setVorlageId}>
            <SelectTrigger>
              <SelectValue placeholder="Vorlage wählen" />
            </SelectTrigger>
            <SelectContent>
              {vorlagen.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="vf-note">Interne Notiz (optional)</Label>
          <Textarea id="vf-note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button onClick={submit} disabled={isPending || !raumId || !vorlageId}>
        <Send className="size-4" />
        {isPending
          ? "Wird versendet…"
          : resend
            ? "Vertrag neu erzeugen & erneut senden"
            : "Vertrag erzeugen & senden"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Der Vertragstext wird beim Senden aus der Vorlage erzeugt und eingefroren. Die Mieterin /
        der Mieter erhält einen Link zum Online-Unterschreiben — erst nach der Unterschrift wird
        der Termin im Kalender geblockt.
      </p>
    </div>
  );
}
