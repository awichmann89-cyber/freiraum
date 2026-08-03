@AGENTS.md

# Freiraum

Raumverwaltung für ein mehretagiges Haus: interne Gruppenbuchungen (Einzel- und wöchentliche
Regeltermine, Sammel-Anfragen) und Vermietungen an Externe mit Vertragsprozess inkl. digitaler
Signatur. Deutsch, mobil + desktop, Deployment auf Vercel.

Vollständiger Plan: `C:\Users\wichmann.alex\.claude\plans\webapp-auf-next-js-basis-sleepy-coral.md`

## Stack

Next.js 16 App Router (Turbopack), React 19, TypeScript, Tailwind v4, shadcn/ui (radix-maia),
Prisma 6 (NICHT auf 7 upgraden ohne Migration der Config!), Neon Postgres, NextAuth v5 beta
(Credentials + bcryptjs), Resend (Log-Fallback ohne API-Key), zod v4, date-fns v4 + @date-fns/tz.

## Befehle

- `npm run dev` — Dev-Server
- `npx prisma dev` — lokale Postgres-DB ohne Docker (PGlite). DATABASE_URL dafür:
  `postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&pgbouncer=true&connection_limit=1`
  (`pgbouncer=true` ist Pflicht — der PGlite-Proxy verkraftet keine Prepared Statements)
- `npm test` — Vitest (Kernlogik: DST, Konfliktprüfung, Kalender-Layout)
- `npm run db:seed` — Admin-User aus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` (tsx lädt .env
  nicht selbst — in Bash: `set -a && source .env && set +a && npm run db:seed`)
- `npx prisma migrate dev` — Migration erstellen (braucht DIRECT_URL)

## Architektur-Regeln (bewusst so entschieden)

1. **Zeiten:** Speicherung strikt UTC, halboffene Intervalle `[startsAt, endsAt)`. Serien
   (`BuchungsSerie`) speichern Wandzeit Europe/Berlin (`weekday`, `startTime`, `endTime`)
   plus `intervalWeeks` (Rhythmus in Wochen, 1 = wöchentlich; Phase am ersten Termin
   verankert). Expansion NUR über `expandWeekly()` in `src/lib/occurrences.ts` (TZDate,
   DST-fest). Nie `new Date(y,m,d,h)` auf dem Server.
2. **Belegung = eine Tabelle `Buchung`** (`art: GRUPPE | VERMIETUNG`). Serien werden 12 Monate
   im Voraus materialisiert (Cron `/api/cron/daily`), Buchungshorizont 12 Monate
   (`BUCHUNGS_HORIZONT_MONATE` in `src/lib/constants.ts`).
3. **Konfliktprüfung:** `checkAvailability()` in `src/lib/availability.ts`. Beim Bestätigen/
   Signieren IMMER Re-Check in der Transaktion (`opts.db = tx`) — Race zwischen Feedback und
   Bestätigung. Vermietungen blocken hart, Gruppenbuchungen nur mit `force` überstimmbar,
   Vermietungen ignorieren Gruppenbuchungen (zahlende Miete hat Vorrang).
4. **Anonymisierung:** `/belegung` nutzt AUSSCHLIESSLICH `getPublicWeekOccupancy()`
   (eigene redaktierte Projektion) — nie die interne `getWeekEvents()` wiederverwenden.
5. **Batch-Anfragen:** `BuchungsAnfrage` + `AnfragePosten`; Admin entscheidet jeden Posten
   einzeln (bewusst kein „Alle bestätigen"). Genau eine Ergebnis-Mail über das transaktionale
   `completedAt`-Gate (`updateMany({ where: { completedAt: null } })`).
6. **Tokens** (`ActionToken`): nur SHA-256-Hashes in der DB, Klartext nur im Mail-Link.
   Admin-Mail-Links haben KEINE Auto-Auth — Login via callbackUrl-Redirect.
7. **Prisma Decimal/Date** nie roh an Client-Komponenten geben — vorher `.toString()` bzw.
   ins View-Model mappen (`CalendarEventVM` in `src/lib/calendar-data.ts`).
8. **Middleware heißt `src/proxy.ts`** (Next 16), edge-safe: importiert nur `auth.config.ts`,
   nie Prisma/bcryptjs.

## Phasen-Status

- **Phase 1 (fertig):** Auth + Einladungen, Stammdaten-Admin, Kalender (TimeGrid custom),
  Buchungs-Wizard mit Live-Verfügbarkeit, Admin-Einzelbestätigung per Mail-Link, öffentliche
  Belegung (anonym) + Mietanfrage-Formular, Cron.
- **Phase 2 (fertig):** Floorplan — PDF wird clientseitig mit pdfjs-dist zu PNG gerendert
  (4096 px lange Kante, NIE serverseitig; pdfjs v6: destroy über den LoadingTask). Upload via
  `@vercel/blob/client` (`/api/floorplan-upload`), ohne `BLOB_READ_WRITE_TOKEN` lokaler
  Fallback nach `public/uploads/` (`/api/floorplan-upload/local`, auf Vercel deaktiviert).
  Shape-Editor unter `/admin/etagen/[id]/plan` (Modi pan/edit/rect/polygon, Vertex-Handles,
  Bulk-Save ersetzt alle `RaumForm`-Zeilen der Etage), Viewer unter `/etagen/[id]`
  (Belegungsfärbung heute, Tap → Drawer → Buchen). Ein SVG mit `<image>` + Polygonen im selben
  viewBox; Pointer-Mathe via `getScreenCTM().inverse()`; Koordinaten normalisiert 0..1 —
  Formen überleben Plan-Re-Uploads. react-zoom-pan-pinch v4: Prop heißt `onTransform`.
- **Phase 3 (fertig):** Vermietungsprozess — Vorlagen-CRUD unter
  `/admin/einstellungen/vorlagen` (Platzhalter-Doku aus `PLACEHOLDER_DOKU` in
  `src/lib/contract.ts`). `sendVertrag` friert den gerenderten Text in `contractText` ein und
  ist zugleich „erneut senden" (invalidiert alte Tokens). Signatur unter `/vertrag/[token]`
  (Canvas-Pad → PNG-Data-URL → Server Action); `signVertrag` re-checkt Vermietungskonflikte
  in der Transaktion und legt erst dann die blockende `Buchung` an. PDF via pdf-lib mit
  **StandardFonts.Helvetica** (WinAnsi reicht für Deutsch; `sanitizeWinAnsi` ersetzt den Rest —
  bewusst KEIN fontkit/keine TTFs, daher kein `outputFileTracingIncludes` nötig).
  Dateien über `src/lib/storage.ts` (Blob `put()` bzw. lokal `public/uploads/`).
  Konfliktauflösung nach Signatur: Absagen/Verschieben kollidierender Gruppenbuchungen mit
  Auto-Mail an alle aktiven Gruppen-User. Cron setzt VERTRAG_GESENDET ohne gültigen Token auf
  ABGELAUFEN; die Token-Seite macht das auch lazy. WICHTIG: der proxy.ts-Matcher schließt
  `uploads/` und `.pdf` aus — sonst wären signierte Verträge hinter dem Login.
