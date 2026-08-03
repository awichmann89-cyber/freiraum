import { describe, expect, it } from "vitest";
import { layoutOverlaps } from "@/lib/calendar-layout";
import { berlinMinutes, splitIntoBerlinDays, startOfWeekISO, weekDaysISO } from "@/lib/calendar-time";

describe("layoutOverlaps", () => {
  it("nicht überlappende Events bekommen volle Breite", () => {
    const result = layoutOverlaps([
      { id: "a", startMin: 60, endMin: 120 },
      { id: "b", startMin: 120, endMin: 180 },
    ]);
    expect(result.every((e) => e.col === 0 && e.colCount === 1)).toBe(true);
  });

  it("überlappende Events teilen sich Spalten", () => {
    const result = layoutOverlaps([
      { id: "a", startMin: 60, endMin: 180 },
      { id: "b", startMin: 120, endMin: 240 },
    ]);
    const byId = Object.fromEntries(result.map((e) => [e.id, e]));
    expect(byId.a.col).toBe(0);
    expect(byId.b.col).toBe(1);
    expect(byId.a.colCount).toBe(2);
    expect(byId.b.colCount).toBe(2);
  });

  it("Ketten-Überlappung bildet einen Cluster, Spalten werden wiederverwendet", () => {
    const result = layoutOverlaps([
      { id: "a", startMin: 0, endMin: 60 },
      { id: "b", startMin: 30, endMin: 90 },
      { id: "c", startMin: 60, endMin: 120 },
    ]);
    const byId = Object.fromEntries(result.map((e) => [e.id, e]));
    expect(byId.a.col).toBe(0);
    expect(byId.b.col).toBe(1);
    expect(byId.c.col).toBe(0); // Spalte von a wird wiederverwendet
    expect(result.every((e) => e.colCount === 2)).toBe(true);
  });
});

describe("berlinMinutes / splitIntoBerlinDays", () => {
  it("liefert Wandzeit-Minuten in Berlin", () => {
    // 16:00 UTC im Sommer = 18:00 Berlin
    expect(berlinMinutes(new Date("2026-07-15T16:00:00.000Z"))).toBe(18 * 60);
    // 17:00 UTC im Winter = 18:00 Berlin
    expect(berlinMinutes(new Date("2026-01-15T17:00:00.000Z"))).toBe(18 * 60);
  });

  it("eintägiges Intervall ergibt ein Segment", () => {
    const segs = splitIntoBerlinDays(
      new Date("2026-08-10T16:00:00.000Z"),
      new Date("2026-08-10T18:00:00.000Z")
    );
    expect(segs).toEqual([{ dateISO: "2026-08-10", startMin: 18 * 60, endMin: 20 * 60 }]);
  });

  it("mehrtägiges Intervall wird an Berliner Mitternacht geteilt", () => {
    // 10.08. 22:00 Berlin bis 11.08. 10:00 Berlin
    const segs = splitIntoBerlinDays(
      new Date("2026-08-10T20:00:00.000Z"),
      new Date("2026-08-11T08:00:00.000Z")
    );
    expect(segs).toEqual([
      { dateISO: "2026-08-10", startMin: 22 * 60, endMin: 1440 },
      { dateISO: "2026-08-11", startMin: 0, endMin: 10 * 60 },
    ]);
  });

  it("Ende exakt Mitternacht erzeugt kein Null-Segment am Folgetag", () => {
    // bis 11.08. 00:00 Berlin = 10.08. 22:00 UTC
    const segs = splitIntoBerlinDays(
      new Date("2026-08-10T18:00:00.000Z"),
      new Date("2026-08-10T22:00:00.000Z")
    );
    expect(segs).toEqual([{ dateISO: "2026-08-10", startMin: 20 * 60, endMin: 1440 }]);
  });
});

describe("Wochen-Helfer", () => {
  it("startOfWeekISO liefert den Montag", () => {
    expect(startOfWeekISO("2026-08-05")).toBe("2026-08-03"); // Mittwoch -> Montag
    expect(startOfWeekISO("2026-08-03")).toBe("2026-08-03");
    expect(startOfWeekISO("2026-08-09")).toBe("2026-08-03"); // Sonntag -> Montag davor
  });

  it("weekDaysISO liefert 7 Tage ab Montag", () => {
    const days = weekDaysISO("2026-08-03");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-03");
    expect(days[6]).toBe("2026-08-09");
  });
});
