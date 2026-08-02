import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { RoomCalendarView } from "@/components/calendar/room-calendar-view";

export default async function KalenderRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  const [activeRooms, [room]] = await Promise.all([
    db
      .select()
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .orderBy(asc(rooms.sortOrder), asc(rooms.name)),
    db.select().from(rooms).where(eq(rooms.id, roomId)).limit(1),
  ]);

  if (!room) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold">Belegungskalender – {room.name}</h1>
        <p className="text-muted-foreground">
          Übersicht über belegte Zeiten. Details zu Anfragen sind aus Datenschutzgründen nicht
          öffentlich einsehbar.
        </p>
      </div>
      <RoomCalendarView rooms={activeRooms} roomId={room.id} />
    </div>
  );
}
