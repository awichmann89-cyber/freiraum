import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { floorplans, floorplanHotspots } from "@/lib/db/schema";

export async function GET() {
  const [floorplan] = await db
    .select()
    .from(floorplans)
    .where(eq(floorplans.isActive, true))
    .limit(1);

  if (!floorplan) {
    return NextResponse.json(null);
  }

  const hotspots = await db
    .select()
    .from(floorplanHotspots)
    .where(eq(floorplanHotspots.floorplanId, floorplan.id));

  return NextResponse.json({ floorplan, hotspots });
}
