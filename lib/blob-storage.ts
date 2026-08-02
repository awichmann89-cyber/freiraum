import "server-only";
import { put, get } from "@vercel/blob";

/**
 * Centralizes access to the (private) Blob store so every write consistently
 * uses access: "private" — the store itself is configured as private in
 * Vercel, so a "public" put() here would simply fail. Reads go through
 * get(..., { access: "private" }) and are only ever exposed to end users via
 * our own token-gated proxy routes (app/api/floorplans/[id]/image,
 * app/api/contracts/pdf/[token]), never as a direct Blob URL.
 */

export function putPrivateBlob(pathname: string, body: Buffer, contentType: string) {
  return put(pathname, body, { access: "private", contentType });
}

export function getPrivateBlob(url: string) {
  return get(url, { access: "private" });
}
