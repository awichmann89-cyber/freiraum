"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Pencil, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarEventVM } from "@/lib/calendar-data";
import { minToHHMM } from "@/lib/calendar-time";
import { formatDate } from "@/lib/tz";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cancelBuchung } from "@/app/(app)/kalender/kalender-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EditBuchungDialog, type EditTarget } from "./edit-buchung-dialog";

export type CalendarViewer = { isAdmin: boolean; gruppeId: string | null };

export function BookingDetailsSheet({
  event,
  onClose,
  viewer,
  raeume = [],
}: {
  event: CalendarEventVM | null;
  onClose: () => void;
  /** Wer schaut? Steuert, ob Termine bearbeitet/abgesagt werden dürfen (eigene Gruppe bzw. Admin: alle). */
  viewer?: CalendarViewer | null;
  /** Raumliste für den Bearbeiten-Dialog. */
  raeume?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [isPending, startTransition] = useTransition();
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    buchungId: string;
    scope: "einzel" | "serie";
  } | null>(null);

  const canModify = !!(
    viewer &&
    event &&
    event.kind === "internal" &&
    event.status === "confirmed" &&
    event.buchungId &&
    (viewer.isAdmin || (viewer.gruppeId && event.gruppeId === viewer.gruppeId))
  );

  const openEdit = (scope: "einzel" | "serie") => {
    if (!event) return;
    setEditTarget({ event, scope });
    onClose(); // Details schließen, Edit-Dialog übernimmt (eigener Event-Snapshot)
  };

  const doCancel = (scope: "einzel" | "serie") => {
    if (!event?.buchungId) return;
    setConfirmTarget({ buchungId: event.buchungId, scope });
  };

  const executeCancel = () => {
    if (!confirmTarget) return;
    startTransition(async () => {
      const res = await cancelBuchung(confirmTarget.buchungId, confirmTarget.scope);
      if (res && "error" in res) {
        toast.error(res.error);
        setConfirmTarget(null);
        return;
      }
      toast.success(confirmTarget.scope === "serie" ? "Serie abgesagt" : "Termin abgesagt");
      setConfirmTarget(null);
      onClose();
      router.refresh();
    });
  };

  const titelZeile = event ? (
    <>
      {event.kind === "external" ? <Building2 className="size-4" /> : null}
      {event.isRecurring ? <Repeat className="size-4" /> : null}
      {event.title ?? "Belegt"}
    </>
  ) : null;

  const details = event ? (
    <div className="space-y-2 text-sm">
      {event.roomName ? (
        <div>
          <span className="text-muted-foreground">Raum: </span>
          {event.roomName}
        </div>
      ) : null}
      <div>
        <span className="text-muted-foreground">Termin: </span>
        {formatDate(new Date(`${event.dateISO}T12:00:00`))}, {minToHHMM(event.startMin)}–
        {minToHHMM(event.endMin)} Uhr
      </div>
      <div className="flex gap-2 pt-1">
        {event.status === "pending" ? (
          <Badge variant="outline">Anfrage — noch nicht bestätigt</Badge>
        ) : (
          <Badge variant="secondary">Bestätigt</Badge>
        )}
        {event.isRecurring ? <Badge variant="outline">Serientermin</Badge> : null}
      </div>

      {canModify ? (
        event.serieId ? (
          <div className="space-y-2 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-24 text-xs text-muted-foreground">Dieser Termin:</span>
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => openEdit("einzel")}>
                <Pencil className="size-4" /> Bearbeiten
              </Button>
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => doCancel("einzel")}>
                <Trash2 className="size-4" /> Absagen
              </Button>
            </div>
            {event.serie ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-24 text-xs text-muted-foreground">Ganze Serie:</span>
                <Button variant="outline" size="sm" disabled={isPending} onClick={() => openEdit("serie")}>
                  <Pencil className="size-4" /> Bearbeiten
                </Button>
                <Button variant="destructive" size="sm" disabled={isPending} onClick={() => doCancel("serie")}>
                  <Trash2 className="size-4" /> Absagen
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-3">
            <Button variant="outline" size="sm" disabled={isPending} onClick={() => openEdit("einzel")}>
              <Pencil className="size-4" /> Bearbeiten
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => doCancel("einzel")}
            >
              <Trash2 className="size-4" /> Termin absagen
            </Button>
          </div>
        )
      ) : null}
    </div>
  ) : null;

  // Desktop: zentrierter Dialog — mobil: Bottom-Drawer mit Swipe.
  const detailsUI = isDesktop ? (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {event ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">{titelZeile}</DialogTitle>
              <DialogDescription>{event.subtitle}</DialogDescription>
            </DialogHeader>
            {details}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  ) : (
    <Drawer open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        {event ? (
          <div className="mx-auto w-full max-w-md pb-8">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">{titelZeile}</DrawerTitle>
              <DrawerDescription>{event.subtitle}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4">{details}</div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );

  return (
    <>
      {detailsUI}
      <EditBuchungDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        raeume={raeume}
        isAdmin={!!viewer?.isAdmin}
      />
      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(o) => {
          if (!o) setConfirmTarget(null);
        }}
        title={confirmTarget?.scope === "serie" ? "Ganze Serie absagen?" : "Termin absagen?"}
        description={
          confirmTarget?.scope === "serie"
            ? "Alle zukünftigen Termine der Serie werden entfernt. Vergangene Termine bleiben erhalten."
            : "Der Termin wird abgesagt und aus dem Kalender entfernt."
        }
        confirmLabel="Absagen"
        destructive
        isPending={isPending}
        onConfirm={executeCancel}
      />
    </>
  );
}
