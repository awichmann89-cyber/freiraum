import { describe, expect, it } from "vitest";
import {
  computeFinalPrice,
  renderContractTemplate,
  suggestBasePrice,
  type ContractData,
} from "@/lib/contract";

const data: ContractData = {
  nummer: "V-2026-001",
  hausName: "Freiraum",
  contactName: "Max Mustermann",
  organization: null,
  contactEmail: "max@example.de",
  contactPhone: null,
  purpose: "Geburtstagsfeier",
  raumName: "Saal",
  etageName: "Erdgeschoss",
  start: new Date("2026-09-05T16:00:00.000Z"), // 18:00 Berlin (CEST)
  end: new Date("2026-09-05T20:00:00.000Z"), // 22:00 Berlin
  priceType: "STUNDE",
  basePrice: 100,
  discountPercent: 10,
  finalPrice: 90,
};

describe("computeFinalPrice", () => {
  it("zieht den Rabatt ab und rundet auf Cent", () => {
    expect(computeFinalPrice(100, 10)).toBe(90);
    expect(computeFinalPrice(99.99, 33.33)).toBe(66.66);
    expect(computeFinalPrice(50, 0)).toBe(50);
    expect(computeFinalPrice(50, 100)).toBe(0);
  });
});

describe("suggestBasePrice", () => {
  it("STUNDE: rundet angebrochene Stunden auf", () => {
    expect(
      suggestBasePrice({
        priceType: "STUNDE",
        priceHourly: 25,
        priceDaily: null,
        start: new Date("2026-09-05T16:00:00Z"),
        end: new Date("2026-09-05T18:30:00Z"), // 2,5h -> 3h
      })
    ).toBe(75);
  });

  it("TAG: mindestens ein Tag, angebrochene Tage aufgerundet", () => {
    expect(
      suggestBasePrice({
        priceType: "TAG",
        priceHourly: null,
        priceDaily: 150,
        start: new Date("2026-09-05T10:00:00Z"),
        end: new Date("2026-09-06T14:00:00Z"), // 28h -> 2 Tage
      })
    ).toBe(300);
  });

  it("liefert null ohne hinterlegten Preis oder bei ungültigem Zeitraum", () => {
    expect(
      suggestBasePrice({
        priceType: "STUNDE",
        priceHourly: null,
        priceDaily: 100,
        start: new Date("2026-09-05T10:00:00Z"),
        end: new Date("2026-09-05T12:00:00Z"),
      })
    ).toBeNull();
    expect(
      suggestBasePrice({
        priceType: "TAG",
        priceHourly: null,
        priceDaily: 100,
        start: new Date("2026-09-05T12:00:00Z"),
        end: new Date("2026-09-05T12:00:00Z"),
      })
    ).toBeNull();
  });
});

describe("renderContractTemplate", () => {
  it("ersetzt Platzhalter inkl. Whitespace-Varianten", () => {
    const result = renderContractTemplate(
      "Vertrag {{nummer}} für {{ name }} im Raum {{raum}}: {{preis}}",
      data
    );
    expect(result).toBe("Vertrag V-2026-001 für Max Mustermann im Raum Saal: 90,00 €");
  });

  it("formatiert Zeitraum in Berliner Wandzeit", () => {
    const result = renderContractTemplate("{{zeit}}", data);
    expect(result).toBe("18:00–22:00 Uhr");
  });

  it("lässt unbekannte Platzhalter sichtbar stehen", () => {
    expect(renderContractTemplate("Hallo {{unbekannt}}", data)).toBe("Hallo {{unbekannt}}");
  });

  it("leere optionale Felder werden zu leerem String", () => {
    expect(renderContractTemplate("Org:{{organisation}};Tel:{{telefon}}", data)).toBe("Org:;Tel:");
  });
});
