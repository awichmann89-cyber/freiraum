import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { floorplans, floorplanHotspots, rooms } from "@/lib/db/schema";
import { FloorplanEditor } from "@/components/floorplan/floorplan-editor";
import { FloorplanUploadForm } from "@/components/floorplan/floorplan-upload-form";

export default async function AdminLageplanPage() {
  const [floorplanRows, allRooms] = await Promise.all([
    db.select().from(floorplans).where(eq(floorplans.isActive, true)).limit(1),
    db
      .select()
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .orderBy(asc(rooms.sortOrder), asc(rooms.name)),
  ]);
  const floorplan = floorplanRows[0];

  const hotspots = floorplan
    ? await db
        .select()
        .from(floorplanHotspots)
        .where(eq(floorplanHotspots.floorplanId, floorplan.id))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lageplan</h1>
        <p className="text-muted-foreground">
          Lageplan hochladen und Räume mit klickbaren Bereichen verknüpfen.
        </p>
      </div>

      {floorplan ? (
        <>
          <FloorplanEditor floorplan={floorplan} hotspots={hotspots} rooms={allRooms} />
          <div className="space-y-2 border-t pt-6">
            <h2 className="font-medium">Neuen Lageplan hochladen</h2>
            <p className="text-sm text-muted-foreground">
              Ersetzt den aktuellen Lageplan. Vorhandene Bereichszuordnungen bleiben dem alten Plan
              zugeordnet und müssen neu markiert werden.
            </p>
            <FloorplanUploadForm />
          </div>
        </>
      ) : (
        <FloorplanUploadForm />
      )}
    </div>
  );
}
