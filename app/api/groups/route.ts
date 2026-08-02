import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createGroupSchema } from "@/lib/validation/group";
import { requireAdmin, isResponse } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;

  const groups = await db
    .select()
    .from(users)
    .where(eq(users.role, "group"))
    .orderBy(asc(users.displayName));

  return NextResponse.json(groups.map(({ passwordHash, ...rest }) => rest));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;

  const body = await request.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "Diese E-Mail-Adresse wird bereits verwendet." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const [group] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: "group",
      displayName: parsed.data.displayName,
      mustChangePassword: true,
    })
    .returning();

  const { passwordHash: _newPasswordHash, ...safeGroup } = group;
  return NextResponse.json(safeGroup, { status: 201 });
}
