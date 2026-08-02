import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, InfoRow } from "./components/layout";

export interface ContractSignedConfirmationProps {
  orgName: string;
  requesterName: string;
  roomNames: string[];
  dateRangeLabel: string;
  pdfUrl: string;
}

export default function ContractSignedConfirmation({
  orgName,
  requesterName,
  roomNames,
  dateRangeLabel,
  pdfUrl,
}: ContractSignedConfirmationProps) {
  return (
    <EmailLayout
      orgName={orgName}
      preview="Vertrag unterschrieben – Buchung bestätigt"
      heading="Vertrag unterschrieben"
    >
      <Text style={{ fontSize: 14 }}>Hallo {requesterName},</Text>
      <Text style={{ fontSize: 14 }}>
        vielen Dank, der Vertrag wurde erfolgreich unterschrieben. Ihre Buchung ist damit
        bestätigt.
      </Text>
      <Section style={{ margin: "16px 0" }}>
        <InfoRow label="Räume" value={roomNames.join(", ")} />
        <InfoRow label="Termin" value={dateRangeLabel} />
      </Section>
      <Button
        href={pdfUrl}
        style={{
          backgroundColor: "#18181b",
          color: "#ffffff",
          padding: "10px 18px",
          borderRadius: 6,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        Unterschriebenen Vertrag herunterladen
      </Button>
    </EmailLayout>
  );
}
