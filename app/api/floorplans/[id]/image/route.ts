import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { floorplans } from "@/lib/db/schema";
import { getPrivateBlob } from "@/lib/blob-storage";

/**
 * Public, unauthenticated proxy for the floorplan image. The underlying Blob
 * store is private, but the floorplan itself is meant to be visible to every
 * site visitor (public/group calendar pages), so this route intentionally
 * has no access check — it just relays the bytes from private Blob storage.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [floorplan] = await db.select().from(floorplans).where(eq(floorplans.id, id)).limit(1);
  if (!floorplan) {
    return NextResponse.json({ error: "Lageplan nicht gefunden." }, { status: 404 });
  }

  const result = await getPrivateBlob(floorplan.imageUrl);
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Bild konnte nicht geladen werden." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
