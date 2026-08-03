// Nur aus Client-Komponenten importieren — pdfjs-dist braucht Browser-Canvas.
// Serverseitiges Rendering ist auf Vercel bewusst tabu (native Canvas-Deps).

/** Lange Kante des gerenderten PNGs. */
const TARGET_LONG_EDGE = 4096;
/** iOS-Safari-Limit für Canvas-Flächen (ältere Geräte ~16 MP). */
const MAX_PIXELS = 16_000_000;

async function getPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  return pdfjs;
}

export type PdfInfo = {
  numPages: number;
  /** Kleine JPEG-Data-URLs für den Seiten-Picker (max. 8 Seiten). */
  previews: string[];
};

export async function loadPdfInfo(file: File, maxPreviewPages = 8): Promise<PdfInfo> {
  const pdfjs = await getPdfjs();
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const doc = await task.promise;

  const previews: string[] = [];
  const count = Math.min(doc.numPages, maxPreviewPages);
  for (let i = 1; i <= count; i++) {
    const page = await doc.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 200 / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, canvas, viewport }).promise;
    previews.push(canvas.toDataURL("image/jpeg", 0.7));
  }

  const numPages = doc.numPages;
  await task.destroy();
  return { numPages, previews };
}

export type RenderedPage = {
  blob: Blob;
  width: number;
  height: number;
};

/** Rendert eine PDF-Seite hochauflösend (lange Kante 4096 px, gedeckelt bei ~16 MP) als PNG. */
export async function renderPdfPageToPng(file: File, pageNumber: number): Promise<RenderedPage> {
  const pdfjs = await getPdfjs();
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const doc = await task.promise;
  const page = await doc.getPage(pageNumber);

  const base = page.getViewport({ scale: 1 });
  let scale = TARGET_LONG_EDGE / Math.max(base.width, base.height);
  if (base.width * scale * base.height * scale > MAX_PIXELS) {
    scale *= Math.sqrt(MAX_PIXELS / (base.width * scale * base.height * scale));
  }

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext("2d")!;
  // Weißer Hintergrund — Pläne mit Transparenz sollen nicht durchscheinen
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, canvas, viewport }).promise;
  await task.destroy();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG-Export fehlgeschlagen"))), "image/png");
  });

  return { blob, width: canvas.width, height: canvas.height };
}
