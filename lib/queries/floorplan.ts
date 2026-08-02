import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { floorplans, floorplanHotspots } from "@/lib/db/schema";

export async function getActiveFloorplanWithHotspots() {
  const [floorplan] = await db
    .select()
    .from(floorplans)
    .where(eq(floorplans.isActive, true))
    .limit(1);

  if (!floorplan) return null;

  const hotspots = await db
    .select()
    .from(floorplanHotspots)
    .where(eq(floorplanHotspots.floorplanId, floorplan.id));

  return { floorplan, hotspots };
}
