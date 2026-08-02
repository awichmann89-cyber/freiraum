import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { floorplanHotspots } from "@/lib/db/schema";
import { requireAdmin, isResponse } from "@/lib/api-auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;
  const { id } = await params;

  const [deleted] = await db
    .delete(floorplanHotspots)
    .where(eq(floorplanHotspots.id, id))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Bereich nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
