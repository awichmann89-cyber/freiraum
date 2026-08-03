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
import { isoWeekday } from "@/lib/occurrences";
import { WEEKDAY_NAMES } from "@/lib/tz";
import type { AnfragePostenInput } from "@/lib/zod-schemas";
import {
  checkPostenAvailability,
  submitAnfrage,
  type AvailabilityFeedback,
} from "@/app/(app)/buchen/buchen-actions";
import { createAdminBuchung } from "@/app/(app)/kalender/kalender-actions";

export type BookingMode =
  | { mode: "gruppe"; gruppeId: string }
  | { mode: "admin"; gruppen: { id: string; name: string }[] };

/** "0" = einmalig, sonst Rhythmus in Wochen. */
const REPEAT_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "Einmalig" },
  { value: "1", label: "Jede Woche" },
  { value: "2", label: "Alle 2 Wochen" },
  { value: "3", label: "Alle 3 Wochen" },
  { value: "4", label: "Alle 4 Wochen" },
  { value: "6", label: "Alle 6 Wochen" },
  { value: "8", label: "Alle 8 Wochen" },
];

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
  const [repeat, setRepeat] = useState("0"); // "0" = einmalig, sonst Wochen-Rhythmus
  const [serienEnde, setSerienEnde] = useState("");
  const [force, setForce] = useState(false);
  const [showForce, setShowForce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wiederholend = repeat !== "0";
  const weekday = startDate ? isoWeekday(startDate) : 1;

  /** Aktueller Termin als Posten-Input (titel wird für die Prüfung ersetzt). */
  const buildPosten = (titelWert: string): AnfragePostenInput =>
    wiederholend
      ? {
          art: "WOECHENTLICH",
          raumId,
          titel: titelWert,
          weekday,
          firstDate: startDate,
          endDate: serienEnde || undefined,
          intervalWeeks: Number(repeat),
          startTime,
          endTime,
        }
      : { art: "EINZEL", raumId, titel: titelWert, startDate, endDate, startTime, endTime };

  // Live-Verfügbarkeit (entprellt); Titel ist für die Prüfung irrelevant.
  const [feedback, setFeedback] = useState<AvailabilityFeedback | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!raumId || !startDate || !startTime || !endTime) return;
    if (!wiederholend && !endDate) return;
    const posten: AnfragePostenInput = wiederholend
      ? {
          art: "WOECHENTLICH",
          raumId,
          titel: "Termin",
          weekday: isoWeekday(startDate),
          firstDate: startDate,
          endDate: serienEnde || undefined,
          intervalWeeks: Number(repeat),
          startTime,
          endTime,
        }
      : { art: "EINZEL", raumId, titel: "Termin", startDate, endDate, startTime, endTime };
    const t = setTimeout(() => {
      setChecking(true);
      checkPostenAvailability(posten)
        .then(setFeedback)
        .finally(() => setChecking(false));
    }, 350);
    return () => clearTimeout(t);
  }, [raumId, startDate, endDate, startTime, endTime, wiederholend, repeat, serienEnde]);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      if (booking.mode === "admin") {
        const posten = buildPosten(titel);
        const res = await createAdminBuchung({ ...posten, gruppeId, force });
        if ("error" in res) {
          setError(res.error);
          if (res.gruppenKonflikt) setShowForce(true);
          return;
        }
        toast.success(
          wiederholend ? "Serie eingetragen und bestätigt." : "Termin eingetragen und bestätigt."
        );
      } else {
        const res = await submitAnfrage({ posten: [buildPosten(titel)] }, { stayOnPage: true });
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
          <Label htmlFor="bd-start-date">{wiederholend ? "Erster Termin" : "Datum von"}</Label>
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
        {wiederholend ? (
          <div className="space-y-2">
            <Label htmlFor="bd-serien-ende">Serienende (optional)</Label>
            <Input
              id="bd-serien-ende"
              type="date"
              min={startDate || undefined}
              value={serienEnde}
              onChange={(e) => setSerienEnde(e.target.value)}
            />
          </div>
        ) : (
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
        )}
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
        <div className="space-y-2 sm:col-span-2">
          <Label>Wiederholung</Label>
          <Select value={repeat} onValueChange={setRepeat}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPEAT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {wiederholend && startDate ? (
            <p className="text-xs text-muted-foreground">
              {Number(repeat) > 1 ? `Alle ${repeat} Wochen` : "Jede Woche"}{" "}
              {WEEKDAY_NAMES[weekday]?.toLowerCase()}s, {startTime}–{endTime} Uhr
              {serienEnde ? "" : " — ohne Enddatum (läuft bis auf Widerruf)"}
            </p>
          ) : null}
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
              ? wiederholend
                ? "Serie eintragen"
                : "Termin eintragen"
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
