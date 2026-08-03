"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { minToHHMM } from "@/lib/calendar-time";
import {
  checkPostenAvailability,
  submitAnfrage,
  type AvailabilityFeedback,
} from "@/app/(app)/buchen/buchen-actions";
import { createAdminBuchung } from "@/app/(app)/kalender/kalender-actions";

export type BookingMode =
  | { mode: "gruppe" }
  | { mode: "admin"; gruppen: { id: string; name: string }[] };

export type BookingSelection = {
  raumId: string;
  dateISO: string;
  startMin: number;
  endMin: number;
};

function AvailabilityHint({
  feedback,
  checking,
}: {
  feedback: AvailabilityFeedback | null;
  checking: boolean;
}) {
  if (checking) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> Verfügbarkeit wird geprüft…
      </p>
    );
  }
  if (!feedback) return null;
  if ("error" in feedback) return <p className="text-sm text-destructive">{feedback.error}</p>;
  return (
    <div className="space-y-1 text-sm">
      {feedback.level === "FREI" ? (
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Frei</Badge>
      ) : feedback.level === "TEILWEISE_BELEGT" ? (
        <Badge className="bg-amber-500 text-white hover:bg-amber-500">Teilweise belegt</Badge>
      ) : (
        <Badge variant="destructive">Belegt</Badge>
      )}
      {feedback.details.length > 0 ? (
        <ul className="list-inside list-disc text-xs text-muted-foreground">
          {feedback.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function BookingForm({
  selection,
  raeume,
  booking,
  onClose,
}: {
  selection: BookingSelection;
  raeume: { id: string; name: string }[];
  booking: BookingMode;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [titel, setTitel] = useState("");
  const [raumId, setRaumId] = useState(selection.raumId);
  const [startDate, setStartDate] = useState(selection.dateISO);
  const [endDate, setEndDate] = useState(selection.dateISO);
  const [startTime, setStartTime] = useState(minToHHMM(selection.startMin));
  const [endTime, setEndTime] = useState(minToHHMM(selection.endMin));
  const [gruppeId, setGruppeId] = useState(
    booking.mode === "admin" ? (booking.gruppen[0]?.id ?? "") : ""
  );
  const [force, setForce] = useState(false);
  const [showForce, setShowForce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live-Verfügbarkeit (entprellt); Titel ist für die Prüfung irrelevant.
  const [feedback, setFeedback] = useState<AvailabilityFeedback | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!raumId || !startDate || !endDate || !startTime || !endTime) return;
    const t = setTimeout(() => {
      setChecking(true);
      checkPostenAvailability({
        art: "EINZEL",
        raumId,
        titel: "Termin",
        startDate,
        endDate,
        startTime,
        endTime,
      })
        .then(setFeedback)
        .finally(() => setChecking(false));
    }, 350);
    return () => clearTimeout(t);
  }, [raumId, startDate, endDate, startTime, endTime]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      if (booking.mode === "admin") {
        const res = await createAdminBuchung({
          raumId,
          gruppeId,
          titel,
          startDate,
          endDate,
          startTime,
          endTime,
          force,
        });
        if ("error" in res) {
          setError(res.error);
          if (res.gruppenKonflikt) setShowForce(true);
          return;
        }
        toast.success("Termin eingetragen und bestätigt.");
      } else {
        const res = await submitAnfrage(
          { posten: [{ art: "EINZEL", raumId, titel, startDate, endDate, startTime, endTime }] },
          { stayOnPage: true }
        );
        if (res && "error" in res) {
          setError(res.error);
          return;
        }
        toast.success("Anfrage gesendet — die Verwaltung prüft den Termin.");
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bd-titel">Aktivität / Titel</Label>
        <Input
          id="bd-titel"
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="z.B. Chorprobe"
          autoFocus
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Raum</Label>
          <Select value={raumId} onValueChange={setRaumId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Raum wählen" />
            </SelectTrigger>
            <SelectContent>
              {raeume.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {booking.mode === "admin" ? (
          <div className="space-y-2">
            <Label>Gruppe</Label>
            <Select value={gruppeId} onValueChange={setGruppeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Gruppe wählen" />
              </SelectTrigger>
              <SelectContent>
                {booking.gruppen.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="bd-start-date">Datum von</Label>
          <Input
            id="bd-start-date"
            type="date"
            value={startDate}
            onChange={(e) => {
              const v = e.target.value;
              setStartDate(v);
              if (!endDate || endDate < v) setEndDate(v);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bd-end-date">Datum bis</Label>
          <Input
            id="bd-end-date"
            type="date"
            min={startDate || undefined}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bd-start-time">Uhrzeit von</Label>
          <Input
            id="bd-start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bd-end-time">Uhrzeit bis</Label>
          <Input
            id="bd-end-time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <AvailabilityHint feedback={feedback} checking={checking} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {booking.mode === "admin" && showForce ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={force} onCheckedChange={(v) => setForce(v === true)} />
          Gruppentermine überstimmen und trotzdem eintragen
        </label>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button onClick={submit} disabled={isPending || !titel.trim() || !raumId}>
          {isPending
            ? "Wird gespeichert…"
            : booking.mode === "admin"
              ? "Termin eintragen"
              : "Anfrage senden"}
        </Button>
      </DialogFooter>
    </div>
  );
}

/**
 * Buchungs-Dialog direkt im Kalender: Gruppen senden eine Anfrage,
 * Admins tragen den Termin sofort bestätigt für eine Gruppe ein.
 */
export function BookingDialog({
  selection,
  onClose,
  raeume,
  booking,
}: {
  selection: BookingSelection | null;
  onClose: () => void;
  raeume: { id: string; name: string }[];
  booking: BookingMode;
}) {
  return (
    <Dialog open={!!selection} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{booking.mode === "admin" ? "Termin eintragen" : "Termin anfragen"}</DialogTitle>
          <DialogDescription>
            {booking.mode === "admin"
              ? "Der Termin wird sofort als bestätigte Gruppenbuchung eingetragen."
              : "Die Verwaltung prüft deine Anfrage — du bekommst das Ergebnis per E-Mail."}
          </DialogDescription>
        </DialogHeader>
        {selection ? (
          <BookingForm
            key={`${selection.raumId}-${selection.dateISO}-${selection.startMin}-${selection.endMin}`}
            selection={selection}
            raeume={raeume}
            booking={booking}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
