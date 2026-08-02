export const metadata = {
  title: "Impressum – Freiraum",
};

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-12 text-sm">
      <h1 className="text-2xl font-semibold">Impressum</h1>
      <p className="text-muted-foreground">
        Angaben gemäß § 5 TMG. Bitte ersetzen Sie die folgenden Platzhalter durch die
        tatsächlichen Angaben Ihrer Organisation, bevor die Seite veröffentlicht wird.
      </p>

      <section className="space-y-1">
        <h2 className="font-medium">Verantwortlich für den Inhalt</h2>
        <p>[Name der Organisation / Verein]</p>
        <p>[Straße und Hausnummer]</p>
        <p>[PLZ und Ort]</p>
      </section>

      <section className="space-y-1">
        <h2 className="font-medium">Kontakt</h2>
        <p>E-Mail: [kontakt@example.org]</p>
        <p>Telefon: [Telefonnummer]</p>
      </section>

      <section className="space-y-1">
        <h2 className="font-medium">Vertretungsberechtigt</h2>
        <p>[Name der vertretungsberechtigten Person(en)]</p>
      </section>

      <section className="space-y-1">
        <h2 className="font-medium">Registereintrag (falls zutreffend)</h2>
        <p>[Registergericht, Registernummer]</p>
      </section>
    </div>
  );
}
