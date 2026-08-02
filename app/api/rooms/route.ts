import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rooms } from "@/lib/db/schema";
import { roomSchema } from "@/lib/validation/room";
import { requireAdmin, isResponse } from "@/lib/api-auth";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const includeInactive = request.nextUrl.searchParams.get("all") === "1";

  if (includeInactive) {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
    }
    const allRooms = await db.select().from(rooms).orderBy(asc(rooms.sortOrder), asc(rooms.name));
    return NextResponse.json(allRooms);
  }

  const activeRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.isActive, true))
    .orderBy(asc(rooms.sortOrder), asc(rooms.name));
  return NextResponse.json(activeRooms);
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;

  const body = await request.json();
  const parsed = roomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [room] = await db
    .insert(rooms)
    .values({
      name: parsed.data.name,
      description: parsed.data.description || null,
      capacity: parsed.data.capacity ?? null,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    })
    .returning();

  return NextResponse.json(room, { status: 201 });
}
