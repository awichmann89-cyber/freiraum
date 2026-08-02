import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { RoomCalendarView } from "@/components/calendar/room-calendar-view";
import { FloorplanViewer } from "@/components/floorplan/floorplan-viewer";
import { getActiveFloorplanWithHotspots } from "@/lib/queries/floorplan";

export const metadata = {
  title: "Belegungskalender – Freiraum",
};

export default async function KalenderPage() {
  const [activeRooms, floorplanData] = await Promise.all([
    db
      .select()
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .orderBy(asc(rooms.sortOrder), asc(rooms.name)),
    getActiveFloorplanWithHotspots(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold">Belegungskalender</h1>
        <p className="text-muted-foreground">
          Übersicht über belegte Zeiten. Details zu Anfragen sind aus Datenschutzgründen nicht
          öffentlich einsehbar.
        </p>
      </div>
      {floorplanData ? (
        <div className="mb-8">
          <FloorplanViewer
            floorplan={floorplanData.floorplan}
            hotspots={floorplanData.hotspots}
            rooms={activeRooms}
          />
        </div>
      ) : null}
      <RoomCalendarView rooms={activeRooms} />
    </div>
  );
}
