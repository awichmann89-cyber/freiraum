import { describe, expect, it } from "vitest";
import { addDaysISO, berlinInstant, expandWeekly, isoWeekday, dbDateToISO } from "@/lib/occurrences";

describe("berlinInstant", () => {
  it("wandelt Winterzeit (CET, UTC+1) korrekt um", () => {
    expect(berlinInstant("2026-01-15", "18:00").toISOString()).toBe("2026-01-15T17:00:00.000Z");
  });

  it("wandelt Sommerzeit (CEST, UTC+2) korrekt um", () => {
    expect(berlinInstant("2026-07-15", "18:00").toISOString()).toBe("2026-07-15T16:00:00.000Z");
  });
});

describe("isoWeekday / addDaysISO", () => {
  it("liefert ISO-Wochentage", () => {
    expect(isoWeekday("2026-08-03")).toBe(1); // Montag
    expect(isoWeekday("2026-08-09")).toBe(7); // Sonntag
  });

  it("addiert Tage über Monatsgrenzen", () => {
    expect(addDaysISO("2026-08-30", 3)).toBe("2026-09-02");
    expect(addDaysISO("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("expandWeekly", () => {
  it("richtet den ersten Termin auf den Serien-Wochentag aus", () => {
    // firstDate ist ein Dienstag, Serie läuft montags -> erster Termin ist der Folge-Montag
    const result = expandWeekly(
      { weekday: 1, startTime: "18:00", endTime: "20:00", firstDate: "2026-08-04" },
      "2026-08-17"
    );
    expect(result.map((r) => r.start.toISOString())).toEqual([
      "2026-08-10T16:00:00.000Z",
      "2026-08-17T16:00:00.000Z",
    ]);
  });

  it("hält die Wandzeit 18:00 über den DST-Beginn (29.03.2026)", () => {
    // Sonntagsserie: 22.03. ist noch CET (17:00 UTC), ab 29.03. CEST (16:00 UTC)
    const result = expandWeekly(
      { weekday: 7, startTime: "18:00", endTime: "20:00", firstDate: "2026-03-22" },
      "2026-04-05"
    );
    expect(result.map((r) => r.start.toISOString())).toEqual([
      "2026-03-22T17:00:00.000Z",
      "2026-03-29T16:00:00.000Z",
      "2026-04-05T16:00:00.000Z",
    ]);
  });

  it("hält die Wandzeit 18:00 über das DST-Ende (25.10.2026)", () => {
    const result = expandWeekly(
      { weekday: 7, startTime: "18:00", endTime: "20:00", firstDate: "2026-10-18" },
      "2026-11-01"
    );
    expect(result.map((r) => r.start.toISOString())).toEqual([
      "2026-10-18T16:00:00.000Z",
      "2026-10-25T17:00:00.000Z",
      "2026-11-01T17:00:00.000Z",
    ]);
  });

  it("respektiert endDate der Serie", () => {
    const result = expandWeekly(
      { weekday: 1, startTime: "10:00", endTime: "11:00", firstDate: "2026-08-03", endDate: "2026-08-10" },
      "2026-12-31"
    );
    expect(result).toHaveLength(2);
  });

  it("beginnt bei fromISO statt firstDate (Nachmaterialisierung)", () => {
    const result = expandWeekly(
      { weekday: 1, startTime: "10:00", endTime: "11:00", firstDate: "2026-01-05" },
      "2026-08-17",
      "2026-08-01"
    );
    expect(result.map((r) => r.start.toISOString().slice(0, 10))).toEqual([
      "2026-08-03",
      "2026-08-10",
      "2026-08-17",
    ]);
  });

  it("erzeugt 14-tägigen Rhythmus (intervalWeeks 2)", () => {
    const result = expandWeekly(
      { weekday: 1, startTime: "10:00", endTime: "11:00", firstDate: "2026-08-03", intervalWeeks: 2 },
      "2026-09-14"
    );
    expect(result.map((r) => r.start.toISOString().slice(0, 10))).toEqual([
      "2026-08-03",
      "2026-08-17",
      "2026-08-31",
      "2026-09-14",
    ]);
  });

  it("hält die Phase des Rhythmus bei fromISO-Nachmaterialisierung", () => {
    // 3-Wochen-Serie ab Mo 05.01.2026: 05.01., 26.01., 16.02., ... — Phase muss
    // auch beim Einstieg mitten im Jahr erhalten bleiben.
    const voll = expandWeekly(
      { weekday: 1, startTime: "10:00", endTime: "11:00", firstDate: "2026-01-05", intervalWeeks: 3 },
      "2026-09-30"
    );
    const nachmaterialisiert = expandWeekly(
      { weekday: 1, startTime: "10:00", endTime: "11:00", firstDate: "2026-01-05", intervalWeeks: 3 },
      "2026-09-30",
      "2026-08-01"
    );
    const erwartet = voll
      .map((r) => r.start.toISOString().slice(0, 10))
      .filter((d) => d >= "2026-08-01");
    expect(nachmaterialisiert.map((r) => r.start.toISOString().slice(0, 10))).toEqual(erwartet);
    expect(erwartet.length).toBeGreaterThan(0);
  });
});

describe("dbDateToISO", () => {
  it("wandelt Prisma-@db.Date (UTC-Mitternacht) in yyyy-mm-dd", () => {
    expect(dbDateToISO(new Date("2026-08-03T00:00:00.000Z"))).toBe("2026-08-03");
  });
});
