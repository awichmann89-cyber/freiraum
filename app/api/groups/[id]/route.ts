import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { resetPasswordSchema } from "@/lib/validation/group";
import { requireAdmin, isResponse } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;
  const { id } = await params;

  const body = await request.json();

  if (typeof body.isActive === "boolean") {
    const [updated] = await db
      .update(users)
      .set({ isActive: body.isActive, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Gruppe nicht gefunden." }, { status: 404 });
    }
    const { passwordHash, ...safe } = updated;
    return NextResponse.json(safe);
  }

  if (typeof body.password === "string") {
    const parsed = resetPasswordSchema.safeParse({ password: body.password });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [updated] = await db
      .update(users)
      .set({ passwordHash, mustChangePassword: true, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    if (!updated) {
      return NextResponse.json({ error: "Gruppe nicht gefunden." }, { status: 404 });
    }
    const { passwordHash: _newPasswordHash, ...safe } = updated;
    return NextResponse.json(safe);
  }

  return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
}
