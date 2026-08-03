import { describe, expect, it } from "vitest";
import { classifyIntervals, type KonfliktBuchung } from "@/lib/availability";

function buchung(startISO: string, endISO: string, id = "b1"): KonfliktBuchung {
  return {
    buchungId: id,
    art: "GRUPPE",
    start: new Date(startISO),
    end: new Date(endISO),
    titel: "Test",
    gruppeName: "Gruppe A",
  };
}

const interval = {
  start: new Date("2026-08-10T16:00:00.000Z"),
  end: new Date("2026-08-10T18:00:00.000Z"),
};

describe("classifyIntervals", () => {
  it("FREI ohne Überlappung", () => {
    const [r] = classifyIntervals([interval], [buchung("2026-08-10T12:00:00Z", "2026-08-10T14:00:00Z")]);
    expect(r.level).toBe("FREI");
    expect(r.konflikte).toHaveLength(0);
  });

  it("FREI bei Rücken-an-Rücken (halboffene Intervalle)", () => {
    const [r] = classifyIntervals(
      [interval],
      [
        buchung("2026-08-10T14:00:00Z", "2026-08-10T16:00:00Z", "vorher"),
        buchung("2026-08-10T18:00:00Z", "2026-08-10T20:00:00Z", "nachher"),
      ]
    );
    expect(r.level).toBe("FREI");
  });

  it("TEILWEISE_BELEGT bei teilweiser Überlappung", () => {
    const [r] = classifyIntervals([interval], [buchung("2026-08-10T17:00:00Z", "2026-08-10T19:00:00Z")]);
    expect(r.level).toBe("TEILWEISE_BELEGT");
    expect(r.konflikte).toHaveLength(1);
  });

  it("VOLL_BELEGT bei komplett abdeckender Buchung", () => {
    const [r] = classifyIntervals([interval], [buchung("2026-08-10T15:00:00Z", "2026-08-10T19:00:00Z")]);
    expect(r.level).toBe("VOLL_BELEGT");
  });

  it("VOLL_BELEGT bei lückenloser Abdeckung durch mehrere Buchungen", () => {
    const [r] = classifyIntervals(
      [interval],
      [
        buchung("2026-08-10T16:00:00Z", "2026-08-10T17:00:00Z", "a"),
        buchung("2026-08-10T17:00:00Z", "2026-08-10T18:00:00Z", "b"),
      ]
    );
    expect(r.level).toBe("VOLL_BELEGT");
    expect(r.konflikte).toHaveLength(2);
  });

  it("TEILWEISE_BELEGT bei Abdeckung mit Lücke", () => {
    const [r] = classifyIntervals(
      [interval],
      [
        buchung("2026-08-10T16:00:00Z", "2026-08-10T16:30:00Z", "a"),
        buchung("2026-08-10T17:00:00Z", "2026-08-10T18:00:00Z", "b"),
      ]
    );
    expect(r.level).toBe("TEILWEISE_BELEGT");
  });

  it("bewertet mehrere Intervalle unabhängig", () => {
    const frei = {
      start: new Date("2026-08-11T16:00:00.000Z"),
      end: new Date("2026-08-11T18:00:00.000Z"),
    };
    const results = classifyIntervals(
      [interval, frei],
      [buchung("2026-08-10T15:00:00Z", "2026-08-10T19:00:00Z")]
    );
    expect(results[0].level).toBe("VOLL_BELEGT");
    expect(results[1].level).toBe("FREI");
  });
});
