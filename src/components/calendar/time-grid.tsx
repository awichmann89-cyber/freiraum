"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEventVM } from "@/lib/calendar-data";
import { layoutOverlaps } from "@/lib/calendar-layout";
import { berlinMinutes, berlinDateISO } from "@/lib/calendar-time";
import { KALENDER_START_STUNDE, KALENDER_END_STUNDE } from "@/lib/constants";

export type TimeGridColumn = {
  key: string; // dateISO (groupBy "date") oder roomId (groupBy "room")
  label: string;
  sublabel?: string;
  dateISO: string;
  roomId?: string;
  href?: string; // macht den Spaltenkopf klickbar
};

const PX_PER_MIN = 28 / 30; // 28px pro 30-Minuten-Slot

export function TimeGrid({
  columns,
  events,
  groupBy,
  startHour = KALENDER_START_STUNDE,
  endHour = KALENDER_END_STUNDE,
  slotMinutes = 30,
  onSlotClick,
  onEventClick,
  minColWidth = 110,
}: {
  columns: TimeGridColumn[];
  events: CalendarEventVM[];
  groupBy: "date" | "room";
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
  onSlotClick?: (col: TimeGridColumn, startMin: number) => void;
  onEventClick?: (ev: CalendarEventVM) => void;
  minColWidth?: number;
}) {
  const windowStartMin = startHour * 60;
  const windowEndMin = endHour * 60;
  const totalHeight = (windowEndMin - windowStartMin) * PX_PER_MIN;
  const slotCount = Math.floor((windowEndMin - windowStartMin) / slotMinutes);

  // Jetzt-Linie (minütlich aktualisiert)
  const [now, setNow] = useState<{ dateISO: string; min: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setNow({ dateISO: berlinDateISO(d), min: berlinMinutes(d) });
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const eventKey = (ev: CalendarEventVM) => (groupBy === "date" ? ev.dateISO : ev.roomId);

  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <div style={{ minWidth: columns.length * minColWidth + 48 }}>
        {/* Kopfzeile */}
        <div className="flex border-b bg-muted/30">
          <div className="w-12 shrink-0" />
          {columns.map((col) => {
            const isToday = now?.dateISO === col.dateISO;
            return (
              <div
                key={col.key}
                className="flex-1 border-l px-1 py-1.5 text-center"
                style={{ minWidth: minColWidth }}
              >
                <div className={cn("truncate text-xs font-medium", isToday && "text-primary")}>
                  {col.href ? (
                    <Link href={col.href} className="hover:underline">
                      {col.label}
                    </Link>
                  ) : (
                    col.label
                  )}
                </div>
                {col.sublabel ? (
                  <div className="truncate text-[10px] text-muted-foreground">{col.sublabel}</div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Raster */}
        <div className="flex">
          {/* Zeitachse */}
          <div className="relative w-12 shrink-0" style={{ height: totalHeight }}>
            {Array.from({ length: endHour - startHour }, (_, i) => (
              <div
                key={i}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted-foreground"
                style={{ top: i * 60 * PX_PER_MIN }}
              >
                {i > 0 ? `${String(startHour + i).padStart(2, "0")}:00` : ""}
              </div>
            ))}
          </div>

          {columns.map((col) => {
            const colEvents = events
              .filter((ev) => eventKey(ev) === col.key)
              .map((ev) => ({
                ...ev,
                startMin: Math.max(ev.startMin, windowStartMin),
                endMin: Math.min(ev.endMin, windowEndMin),
              }))
              .filter((ev) => ev.endMin > ev.startMin);

            const positioned = layoutOverlaps(colEvents);
            const showNow = now && now.dateISO === col.dateISO && now.min >= windowStartMin && now.min <= windowEndMin;

            return (
              <div
                key={col.key}
                className="relative flex-1 border-l"
                style={{
                  height: totalHeight,
                  minWidth: minColWidth,
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, transparent, transparent calc(56px - 1px), var(--border) calc(56px - 1px), var(--border) 56px)",
                }}
              >
                {/* Slot-Tap-Ziele */}
                {onSlotClick
                  ? Array.from({ length: slotCount }, (_, i) => {
                      const min = windowStartMin + i * slotMinutes;
                      const hh = String(Math.floor(min / 60)).padStart(2, "0");
                      const mm = String(min % 60).padStart(2, "0");
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onSlotClick(col, min)}
                          className="absolute inset-x-0 z-0 hover:bg-accent/60"
                          style={{ top: i * slotMinutes * PX_PER_MIN, height: slotMinutes * PX_PER_MIN }}
                          aria-label={`${col.label}, ${hh}:${mm} Uhr buchen`}
                        />
                      );
                    })
                  : null}

                {/* Events */}
                {positioned.map((ev) => {
                  const top = (ev.startMin - windowStartMin) * PX_PER_MIN;
                  const height = Math.max((ev.endMin - ev.startMin) * PX_PER_MIN, 14);
                  const width = 100 / ev.colCount;
                  const isBusy = ev.kind === "busy";
                  const isPending = ev.status === "pending";
                  const isExternal = ev.kind === "external";

                  return (
                    <div
                      key={ev.id}
                      role={onEventClick && !isBusy ? "button" : undefined}
                      onClick={onEventClick && !isBusy ? () => onEventClick(ev) : undefined}
                      className={cn(
                        "absolute z-10 overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight",
                        isBusy && "bg-foreground/15",
                        !isBusy && "border-l-[3px] shadow-sm",
                        isPending && "border border-l-[3px] border-dashed",
                        isExternal && "bg-indigo-500/15 border-indigo-500 text-indigo-950 dark:text-indigo-100",
                        onEventClick && !isBusy && "cursor-pointer hover:brightness-95"
                      )}
                      style={{
                        top,
                        height,
                        left: `calc(${ev.col * width}% + 1px)`,
                        width: `calc(${width}% - 2px)`,
                        ...(isBusy || isExternal
                          ? {}
                          : {
                              borderLeftColor: ev.color ?? "#64748b",
                              backgroundColor: isPending
                                ? undefined
                                : `${ev.color ?? "#64748b"}2e`,
                            }),
                        ...(isPending
                          ? {
                              backgroundImage:
                                "repeating-linear-gradient(45deg, transparent, transparent 5px, color-mix(in srgb, var(--foreground) 8%, transparent) 5px, color-mix(in srgb, var(--foreground) 8%, transparent) 10px)",
                            }
                          : {}),
                      }}
                    >
                      {!isBusy ? (
                        <>
                          <div className="flex items-center gap-1 font-medium">
                            {isExternal ? <Building2 className="size-3 shrink-0" /> : null}
                            {ev.isRecurring ? <Repeat className="size-3 shrink-0" /> : null}
                            <span className="truncate">{ev.title}</span>
                          </div>
                          {height > 30 && ev.subtitle ? (
                            <div className="truncate text-[10px] opacity-70">{ev.subtitle}</div>
                          ) : null}
                        </>
                      ) : height > 24 ? (
                        <span className="text-[10px] text-foreground/50">Belegt</span>
                      ) : null}
                    </div>
                  );
                })}

                {/* Jetzt-Linie */}
                {showNow ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20 border-t-2 border-red-500"
                    style={{ top: (now!.min - windowStartMin) * PX_PER_MIN }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
