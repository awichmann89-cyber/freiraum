export const metadata = {
  title: "Datenschutz – Freiraum",
};

export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12 text-sm">
      <h1 className="text-2xl font-semibold">Datenschutzerklärung</h1>
      <p className="text-muted-foreground">
        Diese Erklärung beschreibt, welche personenbezogenen Daten diese Anwendung verarbeitet.
        Bitte ergänzen Sie die Platzhalter (verantwortliche Stelle) vor der Veröffentlichung und
        lassen Sie den Text bei Bedarf rechtlich prüfen.
      </p>

      <section className="space-y-1">
        <h2 className="font-medium">Verantwortliche Stelle</h2>
        <p>[Name der Organisation], [Adresse], [E-Mail-Adresse]</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Raumanfragen</h2>
        <p>
          Bei einer Raumanfrage verarbeiten wir die von Ihnen angegebenen Kontaktdaten (Name,
          E-Mail-Adresse, optional Telefonnummer), den gewünschten Zeitraum, die gewählten Räume
          sowie Ihre Nachricht. Diese Daten werden zur Bearbeitung Ihrer Anfrage und, im Falle
          einer Vermietung, zur Vertragsabwicklung verwendet. Rechtsgrundlage ist Art. 6 Abs. 1
          lit. b DSGVO (vorvertragliche Maßnahmen bzw. Vertragserfüllung).
        </p>
        <p>
          Andere Nutzer:innen (z. B. weitere anfragende Gruppen) sehen im öffentlichen Kalender
          ausschließlich, dass ein Raum zu einer bestimmten Zeit belegt ist – ohne Namen, Kontakt-
          oder Nachrichtendaten. Diese vollständigen Angaben sind ausschließlich für Admins
          einsehbar.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Online-Vertragsunterschrift</h2>
        <p>
          Beim Abschluss eines Mietvertrags erfassen wir zusätzlich Ihre handschriftliche
          Signatur sowie – ausschließlich zum Zeitpunkt der Unterschrift – Ihre IP-Adresse und
          einen Zeitstempel, um die Unterschrift im Streitfall nachvollziehbar zu machen.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Die IP-Adresse wird
          nicht bei anderen Seitenaufrufen erfasst.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Gruppen-Accounts</h2>
        <p>
          Für wiederkehrende Gruppen legen wir auf Wunsch einen Zugang (E-Mail-Adresse, Passwort)
          an, über den eigene Buchungsanfragen verwaltet werden können.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Speicherdauer</h2>
        <p>
          Wir speichern Ihre Daten so lange, wie es für die Bearbeitung der Anfrage bzw. die
          Vertragsabwicklung und die Erfüllung gesetzlicher Aufbewahrungspflichten erforderlich
          ist.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
          Verarbeitung Ihrer personenbezogenen Daten sowie ein Beschwerderecht bei einer
          Datenschutzaufsichtsbehörde. Wenden Sie sich hierzu an die oben genannte verantwortliche
          Stelle.
        </p>
      </section>
    </div>
  );
}
