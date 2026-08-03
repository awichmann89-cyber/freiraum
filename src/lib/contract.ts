import { formatDate, formatRange, formatTime } from "@/lib/tz";

/** Euro-Format "1.234,50 €" — bewusst ohne Intl (geschützte Leerzeichen stören in PDFs). */
export function formatEuro(value: number): string {
  const negative = value < 0;
  const [int, frac] = Math.abs(value).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}${grouped},${frac} €`;
}

/** Endpreis: Basispreis abzüglich Rabatt, kaufmännisch auf Cent gerundet. */
export function computeFinalPrice(basePrice: number, discountPercent: number): number {
  const raw = basePrice * (1 - discountPercent / 100);
  return Math.round(raw * 100) / 100;
}

/** Preisvorschlag aus Raumpreisen und Zeitraum (Admin kann überschreiben). */
export function suggestBasePrice(opts: {
  priceType: "STUNDE" | "TAG";
  priceHourly: number | null;
  priceDaily: number | null;
  start: Date;
  end: Date;
}): number | null {
  const ms = opts.end.getTime() - opts.start.getTime();
  if (ms <= 0) return null;
  if (opts.priceType === "STUNDE") {
    if (opts.priceHourly == null) return null;
    const hours = Math.ceil(ms / 3_600_000);
    return Math.round(hours * opts.priceHourly * 100) / 100;
  }
  if (opts.priceDaily == null) return null;
  const days = Math.max(1, Math.ceil(ms / 86_400_000));
  return Math.round(days * opts.priceDaily * 100) / 100;
}

export type ContractData = {
  nummer: string;
  hausName: string;
  contactName: string;
  organization?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  purpose: string;
  raumName: string;
  etageName: string;
  start: Date;
  end: Date;
  priceType: "STUNDE" | "TAG";
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
};

/** Alle unterstützten Platzhalter — Grundlage für Rendering und Doku in der UI. */
export function contractPlaceholders(data: ContractData): Record<string, string> {
  return {
    nummer: data.nummer,
    hausName: data.hausName,
    name: data.contactName,
    organisation: data.organization ?? "",
    email: data.contactEmail,
    telefon: data.contactPhone ?? "",
    zweck: data.purpose,
    raum: data.raumName,
    etage: data.etageName,
    datum: formatDate(data.start),
    zeit: `${formatTime(data.start)}–${formatTime(data.end)} Uhr`,
    zeitraum: formatRange(data.start, data.end),
    preistyp: data.priceType === "STUNDE" ? "pro Stunde" : "pro Tag",
    basispreis: formatEuro(data.basePrice),
    rabatt: data.discountPercent > 0 ? `${data.discountPercent.toLocaleString("de-DE")} %` : "–",
    preis: formatEuro(data.finalPrice),
    heute: formatDate(new Date()),
  };
}

/** Für die Vorlagen-UI: Liste der verfügbaren Platzhalter. */
export const PLACEHOLDER_DOKU: { key: string; beschreibung: string }[] = [
  { key: "nummer", beschreibung: "Vermietungsnummer (z.B. V-2026-003)" },
  { key: "hausName", beschreibung: "Name des Hauses (Einstellungen)" },
  { key: "name", beschreibung: "Name der Mieterin / des Mieters" },
  { key: "organisation", beschreibung: "Organisation (falls angegeben)" },
  { key: "email", beschreibung: "E-Mail der Mieterin / des Mieters" },
  { key: "telefon", beschreibung: "Telefonnummer (falls angegeben)" },
  { key: "zweck", beschreibung: "Zweck der Veranstaltung" },
  { key: "raum", beschreibung: "Raumname" },
  { key: "etage", beschreibung: "Etage" },
  { key: "datum", beschreibung: "Datum des Mietbeginns" },
  { key: "zeit", beschreibung: "Uhrzeit von–bis" },
  { key: "zeitraum", beschreibung: "Kompletter Zeitraum inkl. Datum" },
  { key: "preistyp", beschreibung: "'pro Stunde' oder 'pro Tag'" },
  { key: "basispreis", beschreibung: "Preis vor Rabatt" },
  { key: "rabatt", beschreibung: "Rabatt in Prozent (oder –)" },
  { key: "preis", beschreibung: "Endpreis" },
  { key: "heute", beschreibung: "Heutiges Datum" },
];

/** Ersetzt {{platzhalter}} in der Vorlage; unbekannte Platzhalter bleiben sichtbar stehen. */
export function renderContractTemplate(template: string, data: ContractData): string {
  const values = contractPlaceholders(data);
  return template.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (match, key: string) =>
    key in values ? values[key] : match
  );
}

export const DEFAULT_VERTRAGSVORLAGE = `MIETVERTRAG {{nummer}}

zwischen
{{hausName}} (Vermieter)
und
{{name}}{{organisation}} (Mieter), E-Mail: {{email}}

§1 Mietgegenstand
Der Vermieter überlässt dem Mieter den Raum „{{raum}}" ({{etage}}) zur Nutzung für: {{zweck}}.

§2 Mietzeit
{{zeitraum}}

§3 Mietpreis
Der Mietpreis beträgt {{preis}} (Basispreis {{basispreis}}, Rabatt: {{rabatt}}).
Der Betrag ist nach Erhalt der Rechnung zu überweisen.

§4 Pflichten des Mieters
Der Mieter verpflichtet sich, die Räumlichkeiten pfleglich zu behandeln und im
ursprünglichen Zustand zu hinterlassen. Für Schäden haftet der Mieter.

§5 Sonstiges
Änderungen und Ergänzungen bedürfen der Textform.

Stand: {{heute}}`;
