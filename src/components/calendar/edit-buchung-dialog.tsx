"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import type { CalendarEventVM } from "@/lib/calendar-data";
import { berlinDateISO, berlinMinutes, minToHHMM } from "@/lib/calendar-time";
import { WEEKDAY_NAMES } from "@/lib/tz";
import { updateBuchung, updateSerie } from "@/app/(app)/kalender/kalender-actions";

export type EditTarget = { event: CalendarEventVM; scope: "einzel" | "serie" };

const REPEAT_LABELS: Record<string, string> = {
  "1": "Jede Woche",
  "2": "Alle 2 Wochen",
  "3": "Alle 3 Wochen",
  "4": "Alle 4 Wochen",
  "6": "Alle 6 Wochen",
  "8": "Alle 8 Wochen",
};

function EinzelForm({
  event,
  raeume,
  isAdmin,
  onClose,
}: {
  event: CalendarEventVM;
  raeume: { id: string; name: string }[];
  isAdmin: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const start = new Date(event.startsAtISO!);
  const end = new Date(event.endsAtISO!);
  const [titel, setTitel] = useState(event.title ?? "");
  const [raumId, setRaumId] = useState(event.roomId);
  const [startDate, setStartDate] = useState(berlinDateISO(start));
  const [endDate, setEndDate] = useState(berlinDateISO(end));
  const [startTime, setStartTime] = useState(minToHHMM(berlinMinutes(start)));
  const [endTime, setEndTime] = useState(minToHHMM(berlinMinutes(end)));
  const [force, setForce] = useState(false);
  const [showForce, setShowForce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateBuchung(event.buchungId!, {
        titel,
        raumId,
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
      toast.success("Termin aktualisiert.");
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="eb-titel">Aktivität / Titel</Label>
        <Input id="eb-titel" value={titel} onChange={(e) => setTitel(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
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
        <div className="space-y-2">
          <Label htmlFor="eb-start-date">Datum von</Label>
          <Input
            id="eb-start-date"
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
          <Label htmlFor="eb-end-date">Datum bis</Label>
          <Input
            id="eb-end-date"
            type="date"
            min={startDate || undefined}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eb-start-time">Uhrzeit von</Label>
          <Input
            id="eb-start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eb-end-time">Uhrzeit bis</Label>
          <Input
            id="eb-end-time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {isAdmin && showForce ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={force} onCheckedChange={(v) => setForce(v === true)} />
          Gruppentermine überstimmen und trotzdem speichern
        </label>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button onClick={submit} disabled={isPending || !titel.trim() || !raumId}>
          {isPending ? "Wird gespeichert…" : "Speichern"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function SerieForm({
  event,
  raeume,
  isAdmin,
  onClose,
}: {
  event: CalendarEventVM;
  raeume: { id: string; name: string }[];
  isAdmin: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const serie = event.serie!;

  const [titel, setTitel] = useState(event.title ?? "");
  const [raumId, setRaumId] = useState(event.roomId);
  const [weekday, setWeekday] = useState(String(serie.weekday));
  const [startTime, setStartTime] = useState(serie.startTime);
  const [endTime, setEndTime] = useState(serie.endTime);
  const [intervalWeeks, setIntervalWeeks] = useState(String(serie.intervalWeeks));
  const [endDate, setEndDate] = useState(serie.endDateISO ?? "");
  const [force, setForce] = useState(false);
  const [showForce, setShowForce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateSerie(event.serieId!, {
        titel,
        raumId,
        weekday,
        startTime,
        endTime,
        intervalWeeks,
        endDate,
        force,
      });
      if ("error" in res) {
        setError(res.error);
        if (res.gruppenKonflikt) setShowForce(true);
        return;
      }
      toast.success("Serie aktualisiert — zukünftige Termine wurden angepasst.");
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="es-titel">Aktivität / Titel</Label>
        <Input id="es-titel" value={titel} onChange={(e) => setTitel(e.target.value)} />
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
        <div className="space-y-2">
          <Label>Wochentag</Label>
          <Select value={weekday} onValueChange={setWeekday}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(WEEKDAY_NAMES).map(([num, name]) => (
                <SelectItem key={num} value={num}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="es-start-time">Uhrzeit von</Label>
          <Input
            id="es-start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="es-end-time">Uhrzeit bis</Label>
          <Input
            id="es-end-time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Rhythmus</Label>
          <Select value={intervalWeeks} onValueChange={setIntervalWeeks}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REPEAT_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="es-end-date">Serienende (optional)</Label>
          <Input
            id="es-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Änderungen gelten für alle zukünftigen Termine der Serie; vergangene Termine bleiben
        unverändert.
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {isAdmin && showForce ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={force} onCheckedChange={(v) => setForce(v === true)} />
          Gruppentermine überstimmen und trotzdem speichern
        </label>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Abbrechen
        </Button>
        <Button onClick={submit} disabled={isPending || !titel.trim() || !raumId}>
          {isPending ? "Wird gespeichert…" : "Speichern"}
        </Button>
      </DialogFooter>
    </div>
  );
}

/** Bearbeiten eines Termins bzw. einer ganzen Serie aus dem Kalender heraus. */
export function EditBuchungDialog({
  target,
  onClose,
  raeume,
  isAdmin,
}: {
  target: EditTarget | null;
  onClose: () => void;
  raeume: { id: string; name: string }[];
  isAdmin: boolean;
}) {
  const istSerie = target?.scope === "serie";
  return (
    <Dialog open={!!target} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{istSerie ? "Serie bearbeiten" : "Termin bearbeiten"}</DialogTitle>
          <DialogDescription>
            {istSerie
              ? "Wochentag, Uhrzeit, Rhythmus oder Raum der Serie ändern."
              : "Titel, Raum oder Zeitraum dieses Termins ändern."}
          </DialogDescription>
        </DialogHeader>
        {target ? (
          target.scope === "serie" ? (
            <SerieForm
              key={`s-${target.event.serieId}`}
              event={target.event}
              raeume={raeume}
              isAdmin={isAdmin}
              onClose={onClose}
            />
          ) : (
            <EinzelForm
              key={`e-${target.event.buchungId}`}
              event={target.event}
              raeume={raeume}
              isAdmin={isAdmin}
              onClose={onClose}
            />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
