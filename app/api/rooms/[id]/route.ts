import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { roomSchema } from "@/lib/validation/room";
import { requireAdmin, isResponse } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;
  const { id } = await params;

  const body = await request.json();
  const parsed = roomSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { description, ...rest } = parsed.data;

  const [room] = await db
    .update(rooms)
    .set({
      ...rest,
      ...(description !== undefined ? { description: description || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(rooms.id, id))
    .returning();

  if (!room) {
    return NextResponse.json({ error: "Raum nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json(room);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;
  const { id } = await params;

  try {
    const [deleted] = await db.delete(rooms).where(eq(rooms.id, id)).returning();
    if (!deleted) {
      return NextResponse.json({ error: "Raum nicht gefunden." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "Raum wird bereits verwendet (z. B. in Buchungen) und kann nicht gelöscht werden. Deaktivieren Sie ihn stattdessen.",
      },
      { status: 409 }
    );
  }
}
