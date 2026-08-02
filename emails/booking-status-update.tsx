import { Section, Text } from "@react-email/components";
import { EmailLayout, InfoRow } from "./components/layout";

export interface BookingStatusUpdateProps {
  orgName: string;
  requesterName: string;
  roomNames: string[];
  dateRangeLabel: string;
  statusLabel: string;
  statusIsPositive: boolean;
  adminNote?: string;
}

export default function BookingStatusUpdate({
  orgName,
  requesterName,
  roomNames,
  dateRangeLabel,
  statusLabel,
  statusIsPositive,
  adminNote,
}: BookingStatusUpdateProps) {
  return (
    <EmailLayout
      orgName={orgName}
      preview={`Ihre Anfrage: ${statusLabel}`}
      heading={statusIsPositive ? "Ihre Anfrage wurde bestätigt" : "Update zu Ihrer Anfrage"}
    >
      <Text style={{ fontSize: 14 }}>Hallo {requesterName},</Text>
      <Text style={{ fontSize: 14 }}>
        der Status Ihrer Anfrage hat sich geändert: <strong>{statusLabel}</strong>
      </Text>
      <Section style={{ margin: "16px 0" }}>
        <InfoRow label="Räume" value={roomNames.join(", ")} />
        <InfoRow label="Termin" value={dateRangeLabel} />
      </Section>
      {adminNote ? <Text style={{ fontSize: 14 }}>{adminNote}</Text> : null}
    </EmailLayout>
  );
}
