"use client";

import { useState } from "react";
import { TimeGrid, type TimeGridColumn } from "./time-grid";
import { BookingDetailsSheet } from "./booking-details-sheet";
import { BookingDialog, type BookingMode, type BookingSelection } from "./booking-dialog";
import type { CalendarEventVM } from "@/lib/calendar-data";

export type RoomColumn = {
  id: string;
  name: string;
  etageName: string;
};

export function AllRoomsDay({
  dateISO,
  rooms,
  events,
  booking,
  roomHrefBase,
}: {
  dateISO: string;
  rooms: RoomColumn[];
  events: CalendarEventVM[];
  /** null/undefined = nur ansehen; sonst Buchen per Klick/Ziehen direkt im Kalender. */
  booking?: BookingMode | null;
  roomHrefBase?: string; // z.B. "/kalender/raum" -> Spaltenkopf verlinkt
}) {
  const [selected, setSelected] = useState<CalendarEventVM | null>(null);
  const [selection, setSelection] = useState<BookingSelection | null>(null);

  const columns: TimeGridColumn[] = rooms.map((r) => ({
    key: r.id,
    label: r.name,
    sublabel: r.etageName,
    dateISO,
    roomId: r.id,
    href: roomHrefBase ? `${roomHrefBase}/${r.id}?datum=${dateISO}` : undefined,
  }));

  return (
    <>
      <TimeGrid
        columns={columns}
        events={events.filter((e) => e.dateISO === dateISO)}
        groupBy="room"
        minColWidth={140}
        onRangeSelect={
          booking
            ? (col, startMin, endMin) =>
                setSelection({ raumId: col.roomId!, dateISO, startMin, endMin })
            : undefined
        }
        onEventClick={(ev) => setSelected(ev)}
      />
      <BookingDetailsSheet event={selected} onClose={() => setSelected(null)} />
      {booking ? (
        <BookingDialog
          selection={selection}
          onClose={() => setSelection(null)}
          raeume={rooms.map((r) => ({ id: r.id, name: r.name }))}
          booking={booking}
        />
      ) : null}
    </>
  );
}
