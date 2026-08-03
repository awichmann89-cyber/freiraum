import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Serverseitige Dateiablage: Vercel Blob in Produktion, public/uploads/ als
 * Dev-Fallback ohne BLOB_READ_WRITE_TOKEN. Für kleine, serverseitig erzeugte
 * Dateien (Signatur-PNG, Vertrags-PDF) — große Client-Uploads laufen über
 * /api/floorplan-upload.
 */
export async function storeFile(
  data: Buffer,
  filename: string,
  contentType: string,
  folder: string
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${folder}/${filename}`, data, {
      access: "public",
      contentType,
      addRandomSuffix: true,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error("BLOB_READ_WRITE_TOKEN fehlt — Dateiablage auf Vercel nicht möglich.");
  }

  const safe = `${Date.now()}-${randomBytes(4).toString("hex")}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, safe), data);
  return `/uploads/${folder}/${safe}`;
}
