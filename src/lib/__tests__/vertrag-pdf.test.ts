import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { generateVertragPdf } from "@/lib/vertrag-pdf";

// 1x1 weißes PNG
const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

describe("generateVertragPdf", () => {
  it("erzeugt ein gültiges PDF mit deutschem Text und Umlauten", async () => {
    const pdf = await generateVertragPdf({
      nummer: "V-2026-001",
      hausName: "Freiraum",
      contractText: [
        "MIETVERTRAG V-2026-001",
        "",
        "§1 Mietgegenstand",
        "Der Raum „Saal“ für Größenwahn & Co. — Preis: 1.234,50 €",
        "Ein sehr langer Absatz, der definitiv umgebrochen werden muss, weil er deutlich breiter ist als eine A4-Seite mit Rändern jemals sein könnte und daher über mehrere Zeilen läuft.",
      ].join("\n"),
      signedName: "Max Mustermann",
      signedAt: new Date("2026-09-01T10:00:00Z"),
      signaturePng: PNG_1X1,
    });

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it("bricht sehr lange Verträge auf mehrere Seiten um", async () => {
    const longText = Array.from({ length: 120 }, (_, i) => `§${i + 1} Absatz Nummer ${i + 1} mit etwas Text.`).join("\n");
    const pdf = await generateVertragPdf({
      nummer: "V-2026-002",
      hausName: "Freiraum",
      contractText: longText,
      signedName: "Test",
      signedAt: new Date(),
      signaturePng: PNG_1X1,
    });
    const loaded = await PDFDocument.load(pdf);
    expect(loaded.getPageCount()).toBeGreaterThan(1);
  });

  it("wirft nicht bei Zeichen außerhalb von WinAnsi", async () => {
    const pdf = await generateVertragPdf({
      nummer: "V-2026-003",
      hausName: "Freiraum",
      contractText: "Emoji 🎉 und Kyrillisch Привет werden ersetzt.",
      signedName: "Тест",
      signedAt: new Date(),
      signaturePng: PNG_1X1,
    });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
