import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { settingsSchema } from "@/lib/validation/settings";
import { requireAdmin, isResponse } from "@/lib/api-auth";

export async function GET() {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;

  const [row] = await db.select().from(settings).limit(1);
  return NextResponse.json(row ?? null);
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const values = {
    adminNotificationEmail: parsed.data.adminNotificationEmail,
    senderEmail: parsed.data.senderEmail,
    senderName: parsed.data.senderName,
    orgName: parsed.data.orgName,
    orgAddress: parsed.data.orgAddress || null,
    contractFooterText: parsed.data.contractFooterText || null,
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);

  const [updated] = existing
    ? await db.update(settings).set(values).where(eq(settings.id, 1)).returning()
    : await db
        .insert(settings)
        .values({ id: 1, ...values })
        .returning();

  return NextResponse.json(updated);
}
