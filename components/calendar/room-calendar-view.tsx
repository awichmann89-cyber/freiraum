"use client";

import { useRouter } from "next/navigation";
import type { Room } from "@/lib/db/types";
import { BookingCalendar } from "./booking-calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL_ROOMS_VALUE = "all";

export function RoomCalendarView({
  rooms,
  roomId,
  basePath = "/kalender",
}: {
  rooms: Room[];
  roomId?: string;
  basePath?: string;
}) {
  const router = useRouter();

  function handleChange(value: string | null) {
    if (!value || value === ALL_ROOMS_VALUE) {
      router.push(basePath);
    } else {
      router.push(`${basePath}/${value}`);
    }
  }

  return (
    <div className="space-y-4">
      <Select value={roomId ?? ALL_ROOMS_VALUE} onValueChange={handleChange}>
        <SelectTrigger className="w-64">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_ROOMS_VALUE}>Alle Räume</SelectItem>
          {rooms.map((room) => (
            <SelectItem key={room.id} value={room.id}>
              {room.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <BookingCalendar roomId={roomId} />
    </div>
  );
}
