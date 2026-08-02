import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { RoomCalendarView } from "@/components/calendar/room-calendar-view";

export default async function AdminKalenderPage() {
  const allRooms = await db.select().from(rooms).orderBy(asc(rooms.sortOrder), asc(rooms.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kalender</h1>
        <p className="text-muted-foreground">
          Vollständige, unredigierte Ansicht aller Anfragen und Buchungen.
        </p>
      </div>
      <RoomCalendarView rooms={allRooms} basePath="/admin/kalender" />
    </div>
  );
}
