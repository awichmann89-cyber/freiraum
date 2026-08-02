import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { floorplanHotspots } from "@/lib/db/schema";
import { hotspotSchema } from "@/lib/validation/floorplan";
import { requireAdmin, isResponse } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;

  const body = await request.json();
  const parsed = hotspotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [hotspot] = await db
    .insert(floorplanHotspots)
    .values({
      floorplanId: parsed.data.floorplanId,
      roomId: parsed.data.roomId,
      shape: parsed.data.shape,
      coordinates: parsed.data.coordinates,
      label: parsed.data.label || null,
    })
    .returning();

  return NextResponse.json(hotspot, { status: 201 });
}
