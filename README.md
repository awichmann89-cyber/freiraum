# Freiraum

Raumverwaltung für ein mehretagiges Haus — Buchungen von Gruppen (auch wöchentliche
Regeltermine, gesammelte Anfragen) und Vermietungen an Außenstehende. Für Desktop und Mobil
optimiert, gehostet auf Vercel.

## Funktionen (Phase 1)

- **Öffentlich:** anonymisierte Belegungsübersicht mit Blick in die Zukunft (`/belegung`),
  unverbindliches Mietanfrage-Formular (`/anfrage`)
- **Intern (Gruppen-Accounts):** Kalender pro Raum und über alle Räume, Buchungs-Wizard für
  Einzeltermine und wöchentliche Serien mit sofortigem Verfügbarkeits-Feedback
  (frei / teilweise belegt / belegt), Sammel-Anfragen
- **Admin:** Etagen/Räume/Gruppen-Verwaltung, Zugänge mit Einladungs-Mail, Anfragen einzeln
  bestätigen/ablehnen (mit Konfliktanzeige und Wochen-Kalender als Endkontrolle),
  Mietanfragen-Eingang
- **E-Mails:** Einladung, Passwort-Reset, neue Anfrage (an Admins, mit Direktlink), Ergebnis
  der Anfrage, Eingangsbestätigung + Admin-Info bei Mietanfragen

Geplant: Phase 2 — interaktiver Floorplan (PDF-Upload pro Etage, antippbare Räume),
Phase 3 — Vermietungsprozess mit Vertragsgenerierung, Rabatt und digitaler Online-Signatur.

## Entwicklung

```bash
npm install
cp .env.example .env         # Werte eintragen (siehe unten)

# Lokale Datenbank ohne Docker (Prisma PGlite):
npx prisma dev               # läuft im Vordergrund, Terminal offen lassen
# DATABASE_URL in .env:
# postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&pgbouncer=true&connection_limit=1

npx prisma migrate deploy    # Schema anlegen
npm run db:seed              # Admin-User (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)
npm run dev                  # http://localhost:3000
```

Ohne `RESEND_API_KEY` werden alle Mails nur in die Server-Konsole geloggt — die Links
(Einladung, Anfrage-Bestätigung) lassen sich dort herauskopieren.

```bash
npm test                     # Vitest: DST-, Konflikt- und Layout-Logik
```

## Deployment (Vercel)

1. Neon-Postgres anlegen, `DATABASE_URL` (pooled) und `DIRECT_URL` (direkt) setzen
2. Übrige Env-Vars aus `.env.example` in Vercel eintragen (`AUTH_SECRET`, `AUTH_URL`,
   `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `SEED_ADMIN_*`)
3. Deploy — der Build führt `prisma migrate deploy` aus; der Cron (`vercel.json`)
   materialisiert Serientermine täglich nach
