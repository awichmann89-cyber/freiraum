"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Repeat, Trash2 } from "lucide-react";
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

export type CalendarViewer = { isAdmin: boolean; gruppeId: string | null };

export function BookingDetailsSheet({
  event,
  onClose,
  viewer,
}: {
  event: CalendarEventVM | null;
  onClose: () => void;
  /** Wer schaut? Steuert, ob Termine abgesagt werden dürfen (eigene Gruppe bzw. Admin: alle). */
  viewer?: CalendarViewer | null;
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [isPending, startTransition] = useTransition();

  const canCancel = !!(
    viewer &&
    event &&
    event.kind === "internal" &&
    event.status === "confirmed" &&
    event.buchungId &&
    (viewer.isAdmin || (viewer.gruppeId && event.gruppeId === viewer.gruppeId))
  );

  const doCancel = (scope: "einzel" | "serie") => {
    if (!event?.buchungId) return;
    const frage =
      scope === "serie"
        ? "Wirklich die ganze Serie absagen? Alle zukünftigen Termine der Serie werden entfernt."
        : "Diesen Termin wirklich absagen?";
    if (!window.confirm(frage)) return;
    startTransition(async () => {
      const res = await cancelBuchung(event.buchungId!, scope);
      if (res && "error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(scope === "serie" ? "Serie abgesagt" : "Termin abgesagt");
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

      {canCancel ? (
        <div className="flex flex-wrap gap-2 pt-3">
          {event.serieId ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => doCancel("einzel")}
              >
                <Trash2 className="size-4" /> Nur diesen Termin absagen
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={() => doCancel("serie")}
              >
                Ganze Serie absagen
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => doCancel("einzel")}
            >
              <Trash2 className="size-4" /> Termin absagen
            </Button>
          )}
        </div>
      ) : null}
    </div>
  ) : null;

  // Desktop: zentrierter Dialog — mobil: Bottom-Drawer mit Swipe.
  if (isDesktop) {
    return (
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
    );
  }

  return (
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
}
