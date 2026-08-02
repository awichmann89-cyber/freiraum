import { validateSigningToken } from "@/lib/contract-signing";
import { SignatureForm } from "@/components/contract/signature-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "Dieser Link ist ungültig.",
  expired: "Dieser Link ist abgelaufen. Bitte wenden Sie sich an den Vermieter für einen neuen Link.",
  already_used: "Dieser Vertrag wurde bereits unterschrieben oder ist nicht mehr gültig.",
  context_missing: "Zu diesem Vertrag konnten keine Daten gefunden werden.",
};

export default async function VertragSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await validateSigningToken(token);

  if (!result.valid) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="mb-2 text-xl font-semibold">Link nicht verfügbar</h1>
        <p className="text-muted-foreground">{ERROR_MESSAGES[result.reason]}</p>
      </div>
    );
  }

  const { context } = result;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Mietvertrag unterschreiben</h1>
        <p className="text-muted-foreground">
          Bitte prüfen Sie die Angaben und unterschreiben Sie unten.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vertragsdaten</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Mieter:in:</strong> {context.renterName} ({context.renterEmail})
          </p>
          <p>
            <strong>Räume:</strong> {context.roomNames.join(", ")}
          </p>
          <p>
            <strong>Zeitraum:</strong> {context.scheduleLabel}
          </p>
          {result.contract.priceNote ? (
            <p>
              <strong>Konditionen:</strong> {result.contract.priceNote}
            </p>
          ) : null}
          <p>
            <a
              href={`/api/contracts/pdf/${result.contract.pdfAccessToken}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Vertrag als PDF ansehen
            </a>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Unterschrift</CardTitle>
        </CardHeader>
        <CardContent>
          <SignatureForm token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
