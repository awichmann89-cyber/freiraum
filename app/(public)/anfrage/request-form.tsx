"use client";

import type { Room } from "@/lib/db/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SingleBookingForm } from "./single-booking-form";
import { SeriesBookingForm } from "./series-booking-form";

export function RequestForm({ rooms }: { rooms: Room[] }) {
  return (
    <Tabs defaultValue="single">
      <TabsList>
        <TabsTrigger value="single">Einzeltermin</TabsTrigger>
        <TabsTrigger value="series">Wiederkehrender Termin</TabsTrigger>
      </TabsList>
      <TabsContent value="single" className="pt-6">
        <SingleBookingForm rooms={rooms} />
      </TabsContent>
      <TabsContent value="series" className="pt-6">
        <SeriesBookingForm rooms={rooms} />
      </TabsContent>
    </Tabs>
  );
}
