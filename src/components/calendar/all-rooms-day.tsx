"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TimeGrid, type TimeGridColumn } from "./time-grid";
import { BookingDetailsSheet } from "./booking-details-sheet";
import type { CalendarEventVM } from "@/lib/calendar-data";
import { minToHHMM } from "@/lib/calendar-time";

export type RoomColumn = {
  id: string;
  name: string;
  etageName: string;
};

export function AllRoomsDay({
  dateISO,
  rooms,
  events,
  canBook,
  roomHrefBase,
}: {
  dateISO: string;
  rooms: RoomColumn[];
  events: CalendarEventVM[];
  canBook: boolean;
  roomHrefBase?: string; // z.B. "/kalender/raum" -> Spaltenkopf verlinkt
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalendarEventVM | null>(null);

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
        onSlotClick={
          canBook
            ? (col, min) =>
                router.push(`/buchen?raumId=${col.roomId}&datum=${dateISO}&start=${minToHHMM(min)}`)
            : undefined
        }
        onEventClick={(ev) => setSelected(ev)}
      />
      <BookingDetailsSheet event={selected} onClose={() => setSelected(null)} />
    </>
  );
}
