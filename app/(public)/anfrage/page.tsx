import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { RequestForm } from "./request-form";

export const metadata = {
  title: "Raum anfragen – Freiraum",
};

export default async function AnfragePage() {
  const activeRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.isActive, true))
    .orderBy(asc(rooms.sortOrder), asc(rooms.name));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold">Raum anfragen</h1>
        <p className="text-muted-foreground">
          Bitte füllen Sie das Formular aus. Wir prüfen Ihre Anfrage und melden uns per E-Mail
          zurück.
        </p>
      </div>
      <RequestForm rooms={activeRooms} />
    </div>
  );
}
