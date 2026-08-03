"use client";

import Link from "next/link";
import { CalendarDays, CirclePlus } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { minToHHMM } from "@/lib/calendar-time";
import type { ViewerShape } from "./floorplan-viewer";

export function RoomDetailSheet({
  shape,
  dateISO,
  onClose,
}: {
  shape: ViewerShape | null;
  dateISO: string;
  onClose: () => void;
}) {
  return (
    <Drawer open={!!shape} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        {shape ? (
          <div className="mx-auto w-full max-w-md pb-8">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                {shape.raumName}
                {shape.busyNow ? (
                  <Badge variant="destructive">Gerade belegt</Badge>
                ) : (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Gerade frei</Badge>
                )}
              </DrawerTitle>
              <DrawerDescription>
                {[
                  shape.sizeSqm ? `${shape.sizeSqm} m²` : null,
                  shape.capacity ? `bis ${shape.capacity} Personen` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Keine weiteren Angaben"}
              </DrawerDescription>
            </DrawerHeader>
            <div className="space-y-4 px-4">
              <div>
                <h3 className="mb-1 text-sm font-medium">Heute</h3>
                {shape.heuteBuchungen.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Termine heute.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {shape.heuteBuchungen.map((b, i) => (
                      <li key={i} className="flex items-baseline gap-2">
                        <span className="tabular-nums text-muted-foreground">
                          {minToHHMM(b.startMin)}–{minToHHMM(b.endMin)}
                        </span>
                        <span className="truncate">
                          {b.titel}
                          {b.subtitle ? (
                            <span className="text-muted-foreground"> · {b.subtitle}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild className="flex-1">
                  <Link href={`/buchen?raumId=${shape.raumId}&datum=${dateISO}`}>
                    <CirclePlus className="size-4" /> Termin anfragen
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/kalender/raum/${shape.raumId}`}>
                    <CalendarDays className="size-4" /> Kalender öffnen
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
