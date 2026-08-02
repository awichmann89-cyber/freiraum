import { Section, Text } from "@react-email/components";
import { EmailLayout, InfoRow } from "./components/layout";

export interface BookingRequestConfirmationProps {
  orgName: string;
  requesterName: string;
  roomNames: string[];
  dateRangeLabel: string;
  isSeries: boolean;
}

export default function BookingRequestConfirmation({
  orgName,
  requesterName,
  roomNames,
  dateRangeLabel,
  isSeries,
}: BookingRequestConfirmationProps) {
  return (
    <EmailLayout
      orgName={orgName}
      preview="Ihre Anfrage ist eingegangen"
      heading="Ihre Anfrage ist eingegangen"
    >
      <Text style={{ fontSize: 14 }}>Hallo {requesterName},</Text>
      <Text style={{ fontSize: 14 }}>
        vielen Dank für Ihre {isSeries ? "Serienanfrage" : "Anfrage"}. Wir haben sie erhalten und
        prüfen die Verfügbarkeit. Sie erhalten in Kürze eine Rückmeldung per E-Mail.
      </Text>
      <Section style={{ margin: "16px 0" }}>
        <InfoRow label="Räume" value={roomNames.join(", ")} />
        <InfoRow label={isSeries ? "Zeitraum/Serie" : "Termin"} value={dateRangeLabel} />
      </Section>
    </EmailLayout>
  );
}
