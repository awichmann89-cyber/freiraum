import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Dev-Fallback ohne BLOB_READ_WRITE_TOKEN: speichert Uploads unter public/uploads/.
 * Auf Vercel (read-only FS) bewusst deaktiviert — dort läuft der Blob-Client-Upload.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) {
    return NextResponse.json({ error: "Lokaler Upload ist deaktiviert" }, { status: 400 });
  }

  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei übergeben" }, { status: 400 });
  }
  if (!["image/png", "application/pdf"].includes(file.type)) {
    return NextResponse.json({ error: "Nur PNG oder PDF erlaubt" }, { status: 400 });
  }

  const ext = file.type === "application/pdf" ? "pdf" : "png";
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "floorplans");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/floorplans/${name}` });
}
