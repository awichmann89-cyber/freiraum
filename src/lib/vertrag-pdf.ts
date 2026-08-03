import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { formatDate, formatTime } from "@/lib/tz";

// A4 in PDF-Punkten
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const FONT_SIZE = 10.5;
const LINE_HEIGHT = 15;

/**
 * Standard-Fonts (Helvetica) können nur WinAnsi (CP1252) — deckt Deutsch inkl.
 * Umlauten, ß, €, „ " ab. Alles andere wird ersetzt, damit encodeText nicht wirft.
 */
function sanitizeWinAnsi(text: string): string {
  return text
    .replace(/[‐-―]/g, "-") // diverse Striche -> Bindestrich (– — bleiben unten)
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/…/g, "...")
    .replace(/ /g, " ")
     
    .replace(/[^\x00-\xFF€]/g, "?");
}

function wrapLine(line: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (line.trim() === "") return [""];
  const words = line.split(/\s+/);
  const result: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || current === "") {
      current = candidate;
    } else {
      result.push(current);
      current = word;
    }
  }
  if (current) result.push(current);
  return result;
}

export type VertragPdfOptions = {
  nummer: string;
  hausName: string;
  contractText: string;
  signedName: string;
  signedAt: Date;
  /** PNG der Canvas-Unterschrift. */
  signaturePng: Buffer;
};

/** Erzeugt das signierte Vertrags-PDF (Text + Signaturblock). */
export async function generateVertragPdf(opts: VertragPdfOptions): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Mietvertrag ${opts.nummer}`);
  doc.setCreator(opts.hausName);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = PAGE_WIDTH - 2 * MARGIN;

  let page: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  const drawLine = (text: string, useFont: PDFFont, size: number) => {
    ensureSpace(LINE_HEIGHT);
    page.drawText(text, { x: MARGIN, y: y - size, size, font: useFont, color: rgb(0.1, 0.1, 0.12) });
    y -= LINE_HEIGHT;
  };

  // Kopf
  drawLine(sanitizeWinAnsi(opts.hausName), fontBold, 12);
  y -= 6;

  // Vertragstext
  for (const rawLine of opts.contractText.split(/\r?\n/)) {
    const line = sanitizeWinAnsi(rawLine);
    const isHeading = /^(MIETVERTRAG|§\s*\d+)/.test(line.trim());
    for (const wrapped of wrapLine(line, isHeading ? fontBold : font, FONT_SIZE, maxWidth)) {
      drawLine(wrapped, isHeading ? fontBold : font, FONT_SIZE);
    }
  }

  // Signaturblock
  const signature = await doc.embedPng(opts.signaturePng);
  const sigMaxWidth = 200;
  const scale = Math.min(1, sigMaxWidth / signature.width);
  const sigW = signature.width * scale;
  const sigH = signature.height * scale;

  ensureSpace(sigH + 5 * LINE_HEIGHT + 30);
  y -= 24;
  drawLine("Digital unterschrieben:", fontBold, FONT_SIZE);
  y -= 4;
  ensureSpace(sigH + 3 * LINE_HEIGHT);
  page.drawImage(signature, { x: MARGIN, y: y - sigH, width: sigW, height: sigH });
  y -= sigH + 4;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + Math.max(sigW, 180), y },
    thickness: 0.8,
    color: rgb(0.4, 0.4, 0.45),
  });
  y -= LINE_HEIGHT;
  drawLine(sanitizeWinAnsi(opts.signedName), font, FONT_SIZE);
  drawLine(
    sanitizeWinAnsi(
      `Elektronisch unterschrieben am ${formatDate(opts.signedAt)} um ${formatTime(opts.signedAt)} Uhr · Vertrag ${opts.nummer}`
    ),
    font,
    8.5
  );

  return Buffer.from(await doc.save());
}
