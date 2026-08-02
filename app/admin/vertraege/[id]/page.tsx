import { notFound } from "next/navigation";
import { getContractWithContext } from "@/lib/queries/contracts";
import { CONTRACT_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResendButton } from "./resend-button";

export default async function AdminVertragDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getContractWithContext(id);
  if (!result) {
    notFound();
  }
  const { contract, context } = result;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{context?.renterName ?? "Vertrag"}</h1>
        <Badge variant="secondary">{CONTRACT_STATUS_LABELS[contract.status]}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {context ? (
            <>
              <p>
                <strong>E-Mail:</strong> {context.renterEmail}
              </p>
              <p>
                <strong>Räume:</strong> {context.roomNames.join(", ")}
              </p>
              <p>
                <strong>Zeitraum:</strong> {context.scheduleLabel}
              </p>
            </>
          ) : null}
          {contract.priceNote ? (
            <p>
              <strong>Konditionen:</strong> {contract.priceNote}
            </p>
          ) : null}
          <p>
            <strong>Erstellt am:</strong> {formatDate(contract.createdAt)}
          </p>
          {contract.signedAt ? (
            <p>
              <strong>Unterschrieben am:</strong> {formatDateTime(contract.signedAt)} von{" "}
              {contract.signerName}
            </p>
          ) : null}
          <div className="flex gap-4 pt-2">
            {contract.unsignedPdfUrl ? (
              <a
                href={contract.unsignedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Unsignierter Vertrag (PDF)
              </a>
            ) : null}
            {contract.signedPdfUrl ? (
              <a
                href={contract.signedPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Unterschriebener Vertrag (PDF)
              </a>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {contract.status === "sent" ? (
        <Card>
          <CardHeader>
            <CardTitle>Aktionen</CardTitle>
          </CardHeader>
          <CardContent>
            <ResendButton contractId={contract.id} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
