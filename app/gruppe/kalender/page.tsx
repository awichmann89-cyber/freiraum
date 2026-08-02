import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { RoomCalendarView } from "@/components/calendar/room-calendar-view";
import { FloorplanViewer } from "@/components/floorplan/floorplan-viewer";
import { getActiveFloorplanWithHotspots } from "@/lib/queries/floorplan";

export default async function GruppeKalenderPage() {
  const [activeRooms, floorplanData] = await Promise.all([
    db
      .select()
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .orderBy(asc(rooms.sortOrder), asc(rooms.name)),
    getActiveFloorplanWithHotspots(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kalender & Lageplan</h1>
        <p className="text-muted-foreground">Belegung aller Räume auf einen Blick.</p>
      </div>
      {floorplanData ? (
        <FloorplanViewer
          floorplan={floorplanData.floorplan}
          hotspots={floorplanData.hotspots}
          rooms={activeRooms}
          basePath="/gruppe/kalender"
        />
      ) : null}
      <RoomCalendarView rooms={activeRooms} basePath="/gruppe/kalender" />
    </div>
  );
}
