import { NextRequest, NextResponse } from "next/server";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { floorplans } from "@/lib/db/schema";
import { requireAdmin, isResponse } from "@/lib/api-auth";

const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;
  const session = authResult;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "Datei ist zu groß (max. 5 MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detectedType = await fileTypeFromBuffer(buffer);
  if (!detectedType || !ALLOWED_MIME_TYPES.has(detectedType.mime)) {
    return NextResponse.json(
      { error: "Nur PNG-, JPEG- oder WebP-Bilder sind erlaubt." },
      { status: 400 }
    );
  }

  let width: number;
  let height: number;
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) throw new Error("no dimensions");
    width = metadata.width;
    height = metadata.height;
  } catch {
    return NextResponse.json({ error: "Bilddatei konnte nicht gelesen werden." }, { status: 400 });
  }

  const blob = await put(`floorplans/${crypto.randomUUID()}.${detectedType.ext}`, buffer, {
    access: "public",
    contentType: detectedType.mime,
  });

  await db.update(floorplans).set({ isActive: false }).where(eq(floorplans.isActive, true));

  const [created] = await db
    .insert(floorplans)
    .values({
      imageUrl: blob.url,
      imageWidth: width,
      imageHeight: height,
      isActive: true,
      uploadedByUserId: session.user.id,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}
