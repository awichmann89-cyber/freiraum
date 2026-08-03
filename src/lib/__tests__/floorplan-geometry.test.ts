import { describe, expect, it } from "vitest";
import {
  movePoints,
  parsePoints,
  polygonArea,
  polygonCentroid,
  rectToPoints,
  toSvgPoints,
} from "@/lib/floorplan-geometry";

describe("rectToPoints", () => {
  it("normalisiert beliebige Eckpunkt-Reihenfolge", () => {
    const points = rectToPoints({ x: 0.8, y: 0.2 }, { x: 0.2, y: 0.6 });
    expect(points).toEqual([
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
      { x: 0.8, y: 0.6 },
      { x: 0.2, y: 0.6 },
    ]);
  });
});

describe("movePoints", () => {
  it("verschiebt frei innerhalb des Bilds", () => {
    const rect = rectToPoints({ x: 0.1, y: 0.1 }, { x: 0.3, y: 0.3 });
    const moved = movePoints(rect, 0.2, 0.1);
    expect(moved[0]).toEqual({ x: 0.30000000000000004, y: 0.2 });
  });

  it("clampt an der Bildkante (Form bleibt komplett sichtbar)", () => {
    const rect = rectToPoints({ x: 0.7, y: 0.7 }, { x: 0.9, y: 0.9 });
    const moved = movePoints(rect, 0.5, 0.5);
    expect(Math.max(...moved.map((p) => p.x))).toBeCloseTo(1);
    expect(Math.max(...moved.map((p) => p.y))).toBeCloseTo(1);
    // Breite bleibt erhalten
    expect(Math.max(...moved.map((p) => p.x)) - Math.min(...moved.map((p) => p.x))).toBeCloseTo(0.2);
  });
});

describe("polygonCentroid / polygonArea", () => {
  it("Rechteck: Schwerpunkt in der Mitte, Fläche korrekt", () => {
    const rect = rectToPoints({ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.4 });
    const c = polygonCentroid(rect);
    expect(c.x).toBeCloseTo(0.4);
    expect(c.y).toBeCloseTo(0.3);
    expect(polygonArea(rect)).toBeCloseTo(0.4 * 0.2);
  });

  it("L-Form: Schwerpunkt liegt im Polygon-Bereich", () => {
    const l = [
      { x: 0, y: 0 },
      { x: 0.4, y: 0 },
      { x: 0.4, y: 0.2 },
      { x: 0.2, y: 0.2 },
      { x: 0.2, y: 0.6 },
      { x: 0, y: 0.6 },
    ];
    const c = polygonCentroid(l);
    expect(c.x).toBeGreaterThan(0);
    expect(c.x).toBeLessThan(0.4);
    expect(polygonArea(l)).toBeCloseTo(0.4 * 0.2 + 0.2 * 0.4);
  });
});

describe("parsePoints", () => {
  it("parst gültiges JSON und clampt Ausreißer", () => {
    expect(parsePoints([{ x: 0.5, y: 1.5 }, { x: -0.1, y: 0.2 }, "quatsch", null])).toEqual([
      { x: 0.5, y: 1 },
      { x: 0, y: 0.2 },
    ]);
  });

  it("liefert [] für Nicht-Arrays", () => {
    expect(parsePoints(null)).toEqual([]);
    expect(parsePoints({})).toEqual([]);
  });
});

describe("toSvgPoints", () => {
  it("skaliert auf Bildpixel", () => {
    expect(toSvgPoints([{ x: 0.5, y: 0.25 }], 4000, 2000)).toBe("2000.0,500.0");
  });
});
