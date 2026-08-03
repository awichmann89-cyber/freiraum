"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TimeGrid, type TimeGridColumn } from "./time-grid";
import { BookingDetailsSheet } from "./booking-details-sheet";
import { BookingDialog, type BookingMode, type BookingSelection } from "./booking-dialog";
import type { CalendarEventVM } from "@/lib/calendar-data";
import { weekDaysISO } from "@/lib/calendar-time";
import { useIsDesktop } from "@/hooks/use-media-query";
import { WEEKDAY_NAMES_SHORT } from "@/lib/tz";
import { isoWeekday } from "@/lib/occurrences";

function dayLabel(dateISO: string): string {
  const [, m, d] = dateISO.split("-");
  return `${WEEKDAY_NAMES_SHORT[isoWeekday(dateISO)]} ${d}.${m}.`;
}

export function RoomCalendar({
  raumId,
  raumName,
  mondayISO,
  activeDateISO,
  events,
  booking,
  basePath,
}: {
  raumId: string;
  raumName?: string;
  mondayISO: string;
  activeDateISO: string;
  events: CalendarEventVM[];
  /** null/undefined = nur ansehen; sonst Buchen per Klick/Ziehen direkt im Kalender. */
  booking?: BookingMode | null;
  basePath: string; // z.B. "/kalender/raum/xyz"
}) {
  const isDesktop = useIsDesktop();
  const [selected, setSelected] = useState<CalendarEventVM | null>(null);
  const [selection, setSelection] = useState<BookingSelection | null>(null);

  const viewer = booking
    ? booking.mode === "admin"
      ? { isAdmin: true, gruppeId: null }
      : { isAdmin: false, gruppeId: booking.gruppeId }
    : null;

  const days = useMemo(() => weekDaysISO(mondayISO), [mondayISO]);

  const columns: TimeGridColumn[] = (isDesktop ? days : [activeDateISO]).map((d) => ({
    key: d,
    label: dayLabel(d),
    dateISO: d,
    roomId: raumId,
  }));

  return (
    <div className="space-y-2">
      {/* Mobile: Wochen-Chips */}
      <div className="flex gap-1 overflow-x-auto md:hidden">
        {days.map((d) => {
          const hasEvents = events.some((e) => e.dateISO === d);
          return (
            <Link
              key={d}
              href={`${basePath}?datum=${d}`}
              className={cn(
                "flex min-w-11 flex-col items-center rounded-md border px-2 py-1 text-xs",
                d === activeDateISO ? "border-primary bg-primary text-primary-foreground" : "bg-background"
              )}
            >
              <span>{WEEKDAY_NAMES_SHORT[isoWeekday(d)]}</span>
              <span className="font-medium">{d.slice(8)}</span>
              <span
                className={cn(
                  "mt-0.5 size-1.5 rounded-full",
                  hasEvents ? (d === activeDateISO ? "bg-primary-foreground" : "bg-primary") : "bg-transparent"
                )}
              />
            </Link>
          );
        })}
      </div>

      <TimeGrid
        columns={columns}
        events={events}
        groupBy="date"
        minColWidth={isDesktop ? 110 : 260}
        onRangeSelect={
          booking
            ? (col, startMin, endMin) =>
                setSelection({ raumId, dateISO: col.dateISO, startMin, endMin })
            : undefined
        }
        onEventClick={(ev) => setSelected(ev)}
      />

      <BookingDetailsSheet event={selected} onClose={() => setSelected(null)} viewer={viewer} />
      {booking ? (
        <BookingDialog
          selection={selection}
          onClose={() => setSelection(null)}
          raeume={[{ id: raumId, name: raumName ?? "Gewählter Raum" }]}
          booking={booking}
        />
      ) : null}
    </div>
  );
}
