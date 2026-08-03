"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelGruppenBuchung, moveGruppenBuchung } from "./vermietung-actions";

export type KonfliktRow = {
  buchungId: string;
  titel: string;
  gruppeName: string;
  zeitraum: string;
};

export function KonfliktListe({ konflikte }: { konflikte: KonfliktRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [cancelFor, setCancelFor] = useState<KonfliktRow | null>(null);
  const [moveFor, setMoveFor] = useState<KonfliktRow | null>(null);
  const [grund, setGrund] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);

  const doCancel = () => {
    if (!cancelFor) return;
    startTransition(async () => {
      const result = await cancelGruppenBuchung(cancelFor.buchungId, grund);
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Termin abgesagt — die Gruppe wurde per Mail informiert");
      setCancelFor(null);
      setGrund("");
      router.refresh();
    });
  };

  const doMove = () => {
    if (!moveFor) return;
    setMoveError(null);
    startTransition(async () => {
      const result = await moveGruppenBuchung(moveFor.buchungId, { date, startTime, endTime });
      if (result && "error" in result) {
        setMoveError(result.error);
        return;
      }
      toast.success("Termin verschoben — die Gruppe wurde per Mail informiert");
      setMoveFor(null);
      router.refresh();
    });
  };

  return (
    <>
      <ul className="space-y-2">
        {konflikte.map((k) => (
          <li
            key={k.buchungId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm dark:border-amber-700 dark:bg-amber-950/40"
          >
            <span>
              <strong>{k.titel}</strong> ({k.gruppeName}) · {k.zeitraum}
            </span>
            <span className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setMoveFor(k)}>
                <CalendarClock className="size-4" /> Verschieben
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCancelFor(k)}>
                <X className="size-4" /> Absagen
              </Button>
            </span>
          </li>
        ))}
      </ul>

      {/* Absagen */}
      <Dialog open={!!cancelFor} onOpenChange={(o) => !o && setCancelFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Gruppentermin absagen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {cancelFor?.titel} ({cancelFor?.gruppeName}) · {cancelFor?.zeitraum}
            </p>
            <div className="space-y-2">
              <Label htmlFor="konflikt-grund">Begründung (wird der Gruppe mitgeteilt)</Label>
              <Textarea
                id="konflikt-grund"
                value={grund}
                onChange={(e) => setGrund(e.target.value)}
                rows={2}
                placeholder="z.B. Der Raum ist an diesem Tag vermietet."
              />
            </div>
            <Button variant="destructive" className="w-full" onClick={doCancel} disabled={isPending}>
              {isPending ? "Absagen…" : "Absagen & Gruppe informieren"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verschieben */}
      <Dialog open={!!moveFor} onOpenChange={(o) => !o && setMoveFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Gruppentermin verschieben</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {moveFor?.titel} ({moveFor?.gruppeName}) · bisher {moveFor?.zeitraum}
            </p>
            <div className="space-y-2">
              <Label htmlFor="move-date">Neues Datum</Label>
              <Input id="move-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="move-start">Von</Label>
                <Input id="move-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="move-end">Bis</Label>
                <Input id="move-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            {moveError ? <p className="text-sm text-destructive">{moveError}</p> : null}
            <Button className="w-full" onClick={doMove} disabled={isPending || !date || !startTime || !endTime}>
              {isPending ? "Verschieben…" : "Verschieben & Gruppe informieren"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
