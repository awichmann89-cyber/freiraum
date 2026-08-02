import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { RoomCalendarView } from "@/components/calendar/room-calendar-view";

export default async function GruppeKalenderRoomPage({
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kalender – {room.name}</h1>
      </div>
      <RoomCalendarView rooms={activeRooms} roomId={room.id} basePath="/gruppe/kalender" />
    </div>
  );
}
