import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, InfoRow } from "./components/layout";

export interface ContractSigningLinkProps {
  orgName: string;
  requesterName: string;
  roomNames: string[];
  dateRangeLabel: string;
  signUrl: string;
  expiresAtLabel: string;
}

export default function ContractSigningLink({
  orgName,
  requesterName,
  roomNames,
  dateRangeLabel,
  signUrl,
  expiresAtLabel,
}: ContractSigningLinkProps) {
  return (
    <EmailLayout
      orgName={orgName}
      preview="Ihr Mietvertrag ist bereit zur Unterschrift"
      heading="Mietvertrag zur Unterschrift"
    >
      <Text style={{ fontSize: 14 }}>Hallo {requesterName},</Text>
      <Text style={{ fontSize: 14 }}>
        anbei der Link zu Ihrem Mietvertrag. Bitte prüfen Sie die Angaben und unterschreiben Sie
        online per Maus oder Touch.
      </Text>
      <Section style={{ margin: "16px 0" }}>
        <InfoRow label="Räume" value={roomNames.join(", ")} />
        <InfoRow label="Termin" value={dateRangeLabel} />
      </Section>
      <Button
        href={signUrl}
        style={{
          backgroundColor: "#18181b",
          color: "#ffffff",
          padding: "10px 18px",
          borderRadius: 6,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        Vertrag ansehen und unterschreiben
      </Button>
      <Text style={{ fontSize: 12, color: "#71717a", marginTop: 16 }}>
        Dieser Link ist gültig bis {expiresAtLabel} und kann nur einmal verwendet werden.
      </Text>
    </EmailLayout>
  );
}
