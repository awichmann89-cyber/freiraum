"use client";

import { useCallback, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import deLocale from "@fullcalendar/core/locales/de";
import type { EventInput, EventSourceFuncArg } from "@fullcalendar/core";
import { colorForRoomId } from "@/lib/calendar-colors";

export interface CalendarFeedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  roomIds: string[];
  status: string;
  anonymized: boolean;
}

export function BookingCalendar({
  roomId,
  onEventClick,
}: {
  /** Restrict the calendar to a single room; omit for the combined "all rooms" view. */
  roomId?: string;
  onEventClick?: (bookingId: string) => void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (arg: EventSourceFuncArg): Promise<EventInput[]> => {
      const params = new URLSearchParams({
        start: arg.start.toISOString(),
        end: arg.end.toISOString(),
      });
      if (roomId) params.set("roomId", roomId);

      const res = await fetch(`/api/bookings/feed?${params.toString()}`);
      if (!res.ok) {
        setErrorMessage("Termine konnten nicht geladen werden.");
        return [];
      }
      setErrorMessage(null);
      const events: CalendarFeedEvent[] = await res.json();

      return events.map((event) => {
        const color = colorForRoomId(event.roomIds.length === 1 ? event.roomIds[0] : undefined);
        return {
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          backgroundColor: color,
          borderColor: color,
        };
      });
    },
    [roomId]
  );

  return (
    <div className="space-y-2">
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={deLocale}
        firstDay={1}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        height="auto"
        events={fetchEvents}
        eventClick={
          onEventClick
            ? (info) => {
                onEventClick(info.event.id);
              }
            : undefined
        }
      />
    </div>
  );
}
