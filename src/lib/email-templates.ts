import { formatRange, WEEKDAY_NAMES } from "@/lib/tz";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:8px;padding:24px;border:1px solid #e4e4e7;">
      <h1 style="font-size:18px;margin:0 0 16px;color:#18181b;">${escapeHtml(title)}</h1>
      <div style="font-size:14px;line-height:1.6;color:#3f3f46;">${bodyHtml}</div>
    </div>
    <p style="font-size:12px;color:#a1a1aa;text-align:center;margin-top:16px;">Freiraum – Raumverwaltung</p>
  </div>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0;"><a href="${href}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:14px;">${escapeHtml(
    label
  )}</a></p>
  <p style="font-size:12px;color:#a1a1aa;">Falls der Button nicht funktioniert: <br/><a href="${href}" style="color:#52525b;word-break:break-all;">${href}</a></p>`;
}

// ---------- 1: Einladung ----------

export function einladungEmail(opts: { name: string; link: string }) {
  return {
    subject: "Dein Zugang zu Freiraum",
    html: layout(
      "Willkommen bei Freiraum",
      `<p>Hallo ${escapeHtml(opts.name)},</p>
       <p>für dich wurde ein Zugang zur Raumverwaltung <strong>Freiraum</strong> angelegt.
       Lege jetzt dein Passwort fest, um dich anzumelden:</p>
       ${button(opts.link, "Passwort festlegen")}
       <p>Der Link ist 14 Tage gültig.</p>`
    ),
  };
}

// ---------- 2: Passwort-Reset ----------

export function passwortResetEmail(opts: { name: string; link: string }) {
  return {
    subject: "Passwort zurücksetzen",
    html: layout(
      "Passwort zurücksetzen",
      `<p>Hallo ${escapeHtml(opts.name)},</p>
       <p>über diesen Link kannst du ein neues Passwort festlegen:</p>
       ${button(opts.link, "Neues Passwort festlegen")}
       <p>Der Link ist 2 Stunden gültig. Falls du das nicht angefordert hast, kannst du diese Mail ignorieren.</p>`
    ),
  };
}

// ---------- 3: Neue Buchungsanfrage (an Admins) ----------

export type PostenZeile = {
  titel: string;
  raumName: string;
  beschreibung: string; // z.B. "Mo., 05.10.2026, 18:00–20:00 Uhr" oder "Wöchentlich montags 18:00–20:00 ab 05.10.2026"
  konflikt: "FREI" | "TEILWEISE_BELEGT" | "VOLL_BELEGT";
};

const KONFLIKT_LABEL: Record<PostenZeile["konflikt"], string> = {
  FREI: "frei",
  TEILWEISE_BELEGT: "⚠️ teilweise belegt",
  VOLL_BELEGT: "⛔ belegt",
};

function postenTabelle(posten: PostenZeile[]): string {
  const rows = posten
    .map(
      (p) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e4e7;">${escapeHtml(p.titel)}<br/>
          <span style="color:#71717a;font-size:12px;">${escapeHtml(p.raumName)} · ${escapeHtml(p.beschreibung)}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e4e7;white-space:nowrap;">${KONFLIKT_LABEL[p.konflikt]}</td>
      </tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">${rows}</table>`;
}

export function neueAnfrageEmail(opts: {
  gruppeName: string;
  erstellerName: string;
  posten: PostenZeile[];
  link: string;
}) {
  return {
    subject: `Neue Buchungsanfrage von ${opts.gruppeName} (${opts.posten.length} Termin${opts.posten.length === 1 ? "" : "e"})`,
    html: layout(
      "Neue Buchungsanfrage",
      `<p><strong>${escapeHtml(opts.gruppeName)}</strong> (${escapeHtml(opts.erstellerName)}) hat eine Buchungsanfrage gestellt:</p>
       ${postenTabelle(opts.posten)}
       ${button(opts.link, "Anfrage prüfen")}`
    ),
  };
}

// ---------- 4: Ergebnis der Buchungsanfrage (an Ersteller) ----------

export type ErgebnisZeile = {
  titel: string;
  raumName: string;
  beschreibung: string;
  status: "BESTAETIGT" | "ABGELEHNT";
  rejectReason?: string | null;
};

export function anfrageErgebnisEmail(opts: { posten: ErgebnisZeile[]; link: string }) {
  const rows = opts.posten
    .map(
      (p) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e4e7;">${escapeHtml(p.titel)}<br/>
          <span style="color:#71717a;font-size:12px;">${escapeHtml(p.raumName)} · ${escapeHtml(p.beschreibung)}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid #e4e4e7;white-space:nowrap;">${
          p.status === "BESTAETIGT"
            ? '<span style="color:#16a34a;">✔ bestätigt</span>'
            : `<span style="color:#dc2626;">✘ abgelehnt</span>${
                p.rejectReason ? `<br/><span style="font-size:12px;color:#71717a;">${escapeHtml(p.rejectReason)}</span>` : ""
              }`
        }</td>
      </tr>`
    )
    .join("");
  const alleBestaetigt = opts.posten.every((p) => p.status === "BESTAETIGT");
  return {
    subject: alleBestaetigt
      ? "Deine Buchungsanfrage wurde bestätigt"
      : "Ergebnis deiner Buchungsanfrage",
    html: layout(
      "Ergebnis deiner Buchungsanfrage",
      `<p>Deine Buchungsanfrage wurde bearbeitet:</p>
       <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;">${rows}</table>
       ${button(opts.link, "Anfrage ansehen")}`
    ),
  };
}

// ---------- 5: Eingangsbestätigung Mietanfrage (an Externe) ----------

export function mietanfrageBestaetigungEmail(opts: {
  contactName: string;
  raumName: string | null;
  start: Date;
  end: Date;
}) {
  return {
    subject: "Wir haben deine Anfrage erhalten",
    html: layout(
      "Anfrage erhalten",
      `<p>Hallo ${escapeHtml(opts.contactName)},</p>
       <p>vielen Dank für deine Anfrage${opts.raumName ? ` für den Raum <strong>${escapeHtml(opts.raumName)}</strong>` : ""}
       am ${escapeHtml(formatRange(opts.start, opts.end))}.</p>
       <p>Wir prüfen die Verfügbarkeit und melden uns so schnell wie möglich bei dir.</p>`
    ),
  };
}

// ---------- 6: Neue Mietanfrage (an Admins) ----------

export function neueMietanfrageEmail(opts: {
  nummer: string;
  contactName: string;
  organization?: string | null;
  purpose: string;
  raumName: string | null;
  start: Date;
  end: Date;
  link: string;
}) {
  return {
    subject: `Neue Mietanfrage ${opts.nummer} von ${opts.contactName}`,
    html: layout(
      `Neue Mietanfrage ${opts.nummer}`,
      `<p><strong>${escapeHtml(opts.contactName)}</strong>${
        opts.organization ? ` (${escapeHtml(opts.organization)})` : ""
      } möchte ${opts.raumName ? `den Raum <strong>${escapeHtml(opts.raumName)}</strong>` : "einen Raum"} mieten:</p>
       <p>${escapeHtml(formatRange(opts.start, opts.end))}<br/>
       Zweck: ${escapeHtml(opts.purpose)}</p>
       ${button(opts.link, "Anfrage öffnen")}`
    ),
  };
}

// ---------- 7: Vertrag zur Unterschrift (an Mieter:in) ----------

export function vertragEmail(opts: {
  contactName: string;
  nummer: string;
  raumName: string;
  start: Date;
  end: Date;
  preis: string; // formatiert
  link: string;
  gueltigTage: number;
}) {
  return {
    subject: `Dein Mietvertrag ${opts.nummer} zur Unterschrift`,
    html: layout(
      `Mietvertrag ${opts.nummer}`,
      `<p>Hallo ${escapeHtml(opts.contactName)},</p>
       <p>anbei dein Mietvertrag für den Raum <strong>${escapeHtml(opts.raumName)}</strong>
       am ${escapeHtml(formatRange(opts.start, opts.end))} zum Preis von <strong>${escapeHtml(opts.preis)}</strong>.</p>
       <p>Du kannst den Vertrag online lesen und direkt digital unterschreiben:</p>
       ${button(opts.link, "Vertrag ansehen & unterschreiben")}
       <p>Der Link ist ${opts.gueltigTage} Tage gültig. Erst mit deiner Unterschrift ist der
       Termin verbindlich reserviert.</p>`
    ),
  };
}

// ---------- 8: Vertrag signiert (an Admins + Mieter:in) ----------

export function vertragSigniertEmail(opts: {
  nummer: string;
  contactName: string;
  raumName: string;
  start: Date;
  end: Date;
  preis: string;
  adminLink?: string; // nur in der Admin-Variante
}) {
  return {
    subject: `Vertrag ${opts.nummer} wurde unterschrieben`,
    html: layout(
      `Vertrag ${opts.nummer} signiert`,
      `<p><strong>${escapeHtml(opts.contactName)}</strong> hat den Mietvertrag für
       <strong>${escapeHtml(opts.raumName)}</strong> am ${escapeHtml(formatRange(opts.start, opts.end))}
       digital unterschrieben (${escapeHtml(opts.preis)}).</p>
       <p>Der Termin ist damit verbindlich reserviert und im Kalender geblockt.
       Der unterschriebene Vertrag hängt als PDF an dieser E-Mail.</p>
       ${opts.adminLink ? button(opts.adminLink, "Vermietung öffnen") : ""}`
    ),
  };
}

// ---------- 9: Gruppentermin abgesagt/verschoben (an Gruppe) ----------

export function terminGeaendertEmail(opts: {
  typ: "ABGESAGT" | "VERSCHOBEN";
  titel: string;
  raumName: string;
  alt: string; // formatierter alter Termin
  neu?: string; // formatierter neuer Termin (bei VERSCHOBEN)
  grund?: string | null;
}) {
  const verschoben = opts.typ === "VERSCHOBEN";
  return {
    subject: verschoben
      ? `Termin verschoben: ${opts.titel}`
      : `Termin abgesagt: ${opts.titel}`,
    html: layout(
      verschoben ? "Termin verschoben" : "Termin abgesagt",
      `<p>Euer Termin <strong>${escapeHtml(opts.titel)}</strong> im Raum
       <strong>${escapeHtml(opts.raumName)}</strong> wurde von der Verwaltung
       ${verschoben ? "verschoben" : "abgesagt"}:</p>
       <p>Bisher: ${escapeHtml(opts.alt)}${verschoben && opts.neu ? `<br/>Neu: <strong>${escapeHtml(opts.neu)}</strong>` : ""}</p>
       ${opts.grund ? `<p>Grund: ${escapeHtml(opts.grund)}</p>` : ""}
       <p>Bei Fragen meldet euch bitte bei der Verwaltung.</p>`
    ),
  };
}

// ---------- Absage / Storno einer Mietanfrage (an Mieter:in) ----------

export function mietanfrageAbsageEmail(opts: {
  contactName: string;
  nummer: string;
  grund?: string | null;
}) {
  return {
    subject: `Deine Mietanfrage ${opts.nummer}`,
    html: layout(
      `Mietanfrage ${opts.nummer}`,
      `<p>Hallo ${escapeHtml(opts.contactName)},</p>
       <p>leider können wir deine Mietanfrage nicht bestätigen.</p>
       ${opts.grund ? `<p>Grund: ${escapeHtml(opts.grund)}</p>` : ""}
       <p>Melde dich gerne, wenn wir einen Alternativtermin für dich prüfen sollen.</p>`
    ),
  };
}

export function vermietungStorniertEmail(opts: {
  contactName: string;
  nummer: string;
  raumName: string;
  start: Date;
  end: Date;
}) {
  return {
    subject: `Vermietung ${opts.nummer} storniert`,
    html: layout(
      `Vermietung ${opts.nummer} storniert`,
      `<p>Hallo ${escapeHtml(opts.contactName)},</p>
       <p>die Vermietung des Raums <strong>${escapeHtml(opts.raumName)}</strong>
       am ${escapeHtml(formatRange(opts.start, opts.end))} wurde storniert.</p>
       <p>Bei Fragen melde dich bitte bei der Verwaltung.</p>`
    ),
  };
}

// ---------- Hilfen für Posten-Beschreibungen ----------

export function beschreibeEinzel(start: Date, end: Date): string {
  return formatRange(start, end);
}

export function beschreibeWoechentlich(opts: {
  weekday: number;
  startTime: string;
  endTime: string;
  firstDate: string; // bereits formatiert
  endDate?: string | null;
}): string {
  const tag = WEEKDAY_NAMES[opts.weekday] ?? "?";
  const bis = opts.endDate ? ` bis ${opts.endDate}` : "";
  return `Wöchentlich ${tag.toLowerCase()}s ${opts.startTime}–${opts.endTime} Uhr, ab ${opts.firstDate}${bis}`;
}
