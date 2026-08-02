import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GruppeSingleBookingForm } from "./single-form";
import { GruppeSeriesBookingForm } from "./series-form";

export default async function NeueBuchungPage() {
  const activeRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.isActive, true))
    .orderBy(asc(rooms.sortOrder), asc(rooms.name));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Neue Buchung</h1>
        <p className="text-muted-foreground">
          Ihre Buchung wird nach Prüfung durch den Admin freigegeben.
        </p>
      </div>
      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">Einzeltermin</TabsTrigger>
          <TabsTrigger value="series">Wiederkehrender Termin</TabsTrigger>
        </TabsList>
        <TabsContent value="single" className="pt-6">
          <GruppeSingleBookingForm rooms={activeRooms} />
        </TabsContent>
        <TabsContent value="series" className="pt-6">
          <GruppeSeriesBookingForm rooms={activeRooms} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
