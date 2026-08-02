# Freiraum – Raumbuchungs- und Vermietungssystem

Next.js-Anwendung zur Raumplanung: öffentliches Anfrageformular für Vermietungen,
Admin-Freigabe mit anonymisierter Kalenderanzeige, Online-Vertragsunterschrift per
Canvas-Signatur, wiederkehrende wie einmalige Buchungen, Gruppen-Accounts mit
Self-Service, und ein optionaler klickbarer Lageplan.

## Stack

- **Next.js 16** (App Router) auf **Vercel**
- **Neon Postgres** über **Drizzle ORM**
- **Auth.js v5** (Credentials, JWT-Sessions) für Admin- und Gruppen-Logins
- **Resend** + **React Email** für den kompletten E-Mail-Versand
- **Vercel Blob** (privater Store) für Lageplan-Bilder und Vertrags-PDFs, ausgeliefert über
  eigene Proxy-Routen (siehe unten)
- **@react-pdf/renderer** für die Vertrags-PDFs, **react-signature-canvas** für die Unterschrift
- **rrule** für wiederkehrende Terminserien
- **FullCalendar** (nur MIT-lizenzierte Plugins) für alle Kalenderansichten
- **Upstash Redis** (optional) für Rate-Limiting auf den öffentlichen Endpunkten

## Lokales Setup

1. Abhängigkeiten installieren:
   ```bash
   npm install
   ```
2. `.env.example` nach `.env` kopieren und ausfüllen (siehe unten).
3. Datenbankschema anwenden:
   ```bash
   npm run db:push      # für schnelle lokale Iteration
   # oder für versionierte Migrationen:
   npm run db:generate
   npm run db:migrate
   ```
4. Ersten Admin-Account und Grundeinstellungen anlegen:
   ```bash
   npm run db:seed
   ```
   Nutzt `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` aus der `.env`. Der Admin muss das
   Passwort beim ersten Login ändern.
5. Entwicklungsserver starten:
   ```bash
   npm run dev
   ```

## Umgebungsvariablen

Siehe `.env.example`. Wichtig für den Produktivbetrieb:

| Variable | Zweck |
|---|---|
| `DATABASE_URL` | Neon-Verbindungsstring (pooled) |
| `AUTH_SECRET` | Auth.js-Session-Secret, z. B. via `npx auth secret` erzeugen |
| `AUTH_URL` | Öffentliche Basis-URL der Deployment (für Auth-Callbacks) |
| `RESEND_API_KEY` | API-Key von Resend |
| `EMAIL_FROM` | Fallback-Absender, bevor Einstellungen in der DB gepflegt sind |
| `BLOB_READ_WRITE_TOKEN` | Vercel-Blob-Store-Token |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Optional – ohne diese ist Rate-Limiting deaktiviert |
| `APP_BASE_URL` | Für absolute Links in E-Mails (Freigabe-/Signatur-Links) |

Die eigentlichen Absender- und Benachrichtigungs-E-Mail-Adressen werden nach dem ersten
Login unter **Admin → Einstellungen** gepflegt (dort auch der Vertragstext).

### Vercel Blob: privater Store

Der Blob-Store wird als **privat** angelegt (kein direkter öffentlicher URL-Zugriff auf
hochgeladene Dateien). Die App liest private Blobs serverseitig über `lib/blob-storage.ts`
und liefert sie über zwei eigene, token-/ID-basierte Proxy-Routen aus – nirgendwo im Code
wird eine rohe Blob-URL an den Browser weitergegeben:

- `GET /api/floorplans/[id]/image` – bewusst ohne Login, da der Lageplan öffentlich sichtbar
  sein soll (öffentliche Kalenderseite).
- `GET /api/contracts/pdf/[token]` – geschützt durch `contracts.pdfAccessToken`, ein
  langlebiges Capability-Token (im Klartext in der DB, siehe Kommentar im Schema). Wird für
  den PDF-Link auf der Signaturseite, in der Bestätigungs-E-Mail und im Admin-Bereich
  verwendet. Getrennt vom kurzlebigen, gehashten `signingTokenHash`, der nur die eigentliche
  Unterschrift autorisiert und nach Gebrauch ungültig wird.

Falls der Store stattdessen als **öffentlich** angelegt wird, funktioniert die App weiterhin
unverändert (die Proxy-Routen funktionieren auch mit einem öffentlichen Store, nur ohne
dessen Performance-Vorteil, da jeder Aufruf über die eigene Function statt direkt über
Vercels CDN läuft).

## Deployment auf Vercel

1. Repository zu Vercel importieren.
2. Neon-Datenbank anlegen (z. B. über die Vercel-Neon-Integration) und `DATABASE_URL` setzen.
3. Alle Umgebungsvariablen aus der Tabelle oben in den Vercel-Projekteinstellungen setzen.
4. Vercel Blob Store anlegen (privat oder öffentlich, siehe Hinweis oben) und
   `BLOB_READ_WRITE_TOKEN` setzen.
5. Bei Resend die Absenderdomain verifizieren (SPF, DKIM, idealerweise DMARC), **bevor**
   produktiv E-Mails versendet werden – unverifizierte Domains werden gedrosselt oder als
   Spam markiert.
6. Migrationen gegen die Produktions-DB anwenden (`npm run db:migrate`, lokal mit
   Produktions-`DATABASE_URL` oder als manueller Deploy-Schritt – nicht aus einer
   serverless Function heraus).
7. Seed-Skript einmalig gegen die Produktions-DB ausführen, um den ersten Admin-Account
   anzulegen.
8. Unter **Admin → Einstellungen** die Benachrichtigungs-E-Mail, Absenderadresse,
   Organisationsdaten und den Vertragstext pflegen.
9. `/impressum` und `/datenschutz` (`app/(public)/impressum`, `app/(public)/datenschutz`)
   mit den echten rechtlichen Angaben der Organisation ausfüllen.

## Bekannte Scope-Grenzen dieser ersten Version

- Serien-Vorkommnisse werden bei Freigabe einmalig materialisiert; das nachträgliche
  Verschieben/Stornieren **einzelner** Termine einer bereits freigegebenen Serie sowie das
  Neuberechnen künftiger Termine nach einer Serienänderung ist nicht implementiert.
- Der Lageplan-Editor unterstützt aktuell nur rechteckige Bereiche (kein Polygon).
- Kein Bot-Schutz (Honeypot/Turnstile) auf dem öffentlichen Anfrageformular – nur
  IP-basiertes Rate-Limiting.
