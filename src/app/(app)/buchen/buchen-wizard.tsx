"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Loader2, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { anfragePostenSchema, type AnfragePostenInput } from "@/lib/zod-schemas";
import { WEEKDAY_NAMES } from "@/lib/tz";
import {
  checkPostenAvailability,
  submitAnfrage,
  type AvailabilityFeedback,
} from "./buchen-actions";

type Entry = {
  key: string;
  input: AnfragePostenInput;
  raumName: string;
  feedback?: AvailabilityFeedback;
  checking: boolean;
};

function isoZuDeutsch(iso: string): string {
  return iso.split("-").reverse().join(".");
}

function beschreibeInput(p: AnfragePostenInput): string {
  if (p.art === "EINZEL") {
    if (p.startDate === p.endDate) {
      return `${isoZuDeutsch(p.startDate)}, ${p.startTime}–${p.endTime} Uhr`;
    }
    return `${isoZuDeutsch(p.startDate)}, ${p.startTime} Uhr – ${isoZuDeutsch(p.endDate)}, ${p.endTime} Uhr`;
  }
  const bis = p.endDate ? ` bis ${p.endDate.split("-").reverse().join(".")}` : "";
  return `Wöchentlich ${WEEKDAY_NAMES[p.weekday]?.toLowerCase()}s ${p.startTime}–${p.endTime} Uhr, ab ${p.firstDate
    .split("-")
    .reverse()
    .join(".")}${bis}`;
}

function LevelBadge({ feedback }: { feedback?: AvailabilityFeedback }) {
  if (!feedback) return null;
  if ("error" in feedback) return <Badge variant="destructive">{feedback.error}</Badge>;
  switch (feedback.level) {
    case "FREI":
      return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Frei</Badge>;
    case "TEILWEISE_BELEGT":
      return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Teilweise belegt</Badge>;
    case "VOLL_BELEGT":
      return <Badge variant="destructive">Belegt</Badge>;
  }
}

export function BuchenWizard({
  raeume,
  prefill,
}: {
  raeume: { id: string; name: string; etageName: string }[];
  prefill?: { raumId?: string; date?: string; start?: string; end?: string };
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [notiz, setNotiz] = useState("");
  const [isSubmitting, startSubmit] = useTransition();

  // Formularzustand für "Termin hinzufügen"
  const [art, setArt] = useState<"EINZEL" | "WOECHENTLICH">("EINZEL");
  const [raumId, setRaumId] = useState(prefill?.raumId ?? "");
  const [titel, setTitel] = useState("");
  const [startDate, setStartDate] = useState(prefill?.date ?? "");
  const [endDateEinzel, setEndDateEinzel] = useState(prefill?.date ?? "");
  const [startTime, setStartTime] = useState(prefill?.start ?? "");
  const [endTime, setEndTime] = useState(prefill?.end ?? "");
  const [weekday, setWeekday] = useState("1");
  const [firstDate, setFirstDate] = useState(prefill?.date ?? "");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const addEntry = () => {
    setFormError(null);
    const raw =
      art === "EINZEL"
        ? { art, raumId, titel, startDate, endDate: endDateEinzel || startDate, startTime, endTime }
        : { art, raumId, titel, weekday, startTime, endTime, firstDate, endDate };

    const parsed = anfragePostenSchema.safeParse(raw);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Bitte alle Felder ausfüllen.");
      return;
    }

    const key = crypto.randomUUID();
    const raumName = raeume.find((r) => r.id === parsed.data.raumId)?.name ?? "?";
    setEntries((prev) => [...prev, { key, input: parsed.data, raumName, checking: true }]);
    setTitel("");

    void checkPostenAvailability(parsed.data).then((feedback) => {
      setEntries((prev) =>
        prev.map((e) => (e.key === key ? { ...e, feedback, checking: false } : e))
      );
    });
  };

  const removeEntry = (key: string) => {
    setEntries((prev) => prev.filter((e) => e.key !== key));
  };

  const submit = () => {
    startSubmit(async () => {
      const result = await submitAnfrage({
        notiz: notiz || undefined,
        posten: entries.map((e) => e.input),
      });
      // Bei Erfolg redirectet die Action; hierher kommen wir nur im Fehlerfall.
      if (result && "error" in result) toast.error(result.error);
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Termin hinzufügen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={art} onValueChange={(v) => setArt(v as typeof art)}>
            <TabsList>
              <TabsTrigger value="EINZEL">Einzeltermin</TabsTrigger>
              <TabsTrigger value="WOECHENTLICH">
                <Repeat className="size-3.5" /> Wöchentlich
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Raum</Label>
              <Select value={raumId} onValueChange={setRaumId}>
                <SelectTrigger>
                  <SelectValue placeholder="Raum wählen" />
                </SelectTrigger>
                <SelectContent>
                  {raeume.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · {r.etageName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="posten-titel">Aktivität / Titel</Label>
              <Input
                id="posten-titel"
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="z.B. Chorprobe"
              />
            </div>

            {art === "EINZEL" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="posten-start-date">Datum von</Label>
                  <Input
                    id="posten-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      setStartDate(v);
                      // Enddatum folgt, solange es nicht bewusst dahinter liegt
                      if (!endDateEinzel || endDateEinzel < v) setEndDateEinzel(v);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posten-end-date">Datum bis</Label>
                  <Input
                    id="posten-end-date"
                    type="date"
                    min={startDate || undefined}
                    value={endDateEinzel}
                    onChange={(e) => setEndDateEinzel(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Wochentag</Label>
                  <Select value={weekday} onValueChange={setWeekday}>
                    <SelectTrigger>
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
                  <Label htmlFor="posten-first">Erster Termin ab</Label>
                  <Input
                    id="posten-first"
                    type="date"
                    value={firstDate}
                    onChange={(e) => setFirstDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="posten-end">Ende der Serie (optional)</Label>
                  <Input
                    id="posten-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="posten-start">Uhrzeit von</Label>
              <Input
                id="posten-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="posten-ende">Uhrzeit bis</Label>
              <Input
                id="posten-ende"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

          <Button type="button" variant="secondary" onClick={addEntry}>
            <CalendarPlus className="size-4" /> Zur Anfrage hinzufügen
          </Button>
        </CardContent>
      </Card>

      {entries.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Deine Anfrage ({entries.length} Termin{entries.length === 1 ? "" : "e"})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {entries.map((e) => (
                <li key={e.key} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{e.input.titel}</span>
                        {e.checking ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : (
                          <LevelBadge feedback={e.feedback} />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {e.raumName} · {beschreibeInput(e.input)}
                      </p>
                      {e.feedback && "ok" in e.feedback ? (
                        <>
                          {e.feedback.level !== "FREI" ? (
                            <p className="mt-1 text-xs text-muted-foreground">{e.feedback.summary}</p>
                          ) : null}
                          {e.feedback.details.length > 0 ? (
                            <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                              {e.feedback.details.map((d, i) => (
                                <li key={i}>{d}</li>
                              ))}
                            </ul>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeEntry(e.key)}
                      aria-label="Termin entfernen"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-2">
              <Label htmlFor="anfrage-notiz">Nachricht an die Verwaltung (optional)</Label>
              <Textarea
                id="anfrage-notiz"
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={submit} disabled={isSubmitting || entries.some((e) => e.checking)}>
              {isSubmitting ? "Wird gesendet…" : "Anfrage absenden"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Die Termine sind erst verbindlich, wenn die Verwaltung sie bestätigt hat. Du bekommst
              das Ergebnis per E-Mail.
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Füge einen oder mehrere Termine hinzu — auch verschiedene Tage mit unterschiedlichen
          Aktivitäten — und sende alles gesammelt als eine Anfrage ab.
        </p>
      )}
    </div>
  );
}
