"use client";

import { Building2, Repeat } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import type { CalendarEventVM } from "@/lib/calendar-data";
import { minToHHMM } from "@/lib/calendar-time";
import { formatDate } from "@/lib/tz";

export function BookingDetailsSheet({
  event,
  onClose,
}: {
  event: CalendarEventVM | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        {event ? (
          <div className="mx-auto w-full max-w-md pb-8">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                {event.kind === "external" ? <Building2 className="size-4" /> : null}
                {event.isRecurring ? <Repeat className="size-4" /> : null}
                {event.title ?? "Belegt"}
              </DrawerTitle>
              <DrawerDescription>{event.subtitle}</DrawerDescription>
            </DrawerHeader>
            <div className="space-y-2 px-4 text-sm">
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
                {event.isRecurring ? <Badge variant="outline">Wöchentlicher Termin</Badge> : null}
              </div>
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
