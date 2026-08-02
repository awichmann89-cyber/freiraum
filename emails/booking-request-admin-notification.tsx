import { Button, Section, Text } from "@react-email/components";
import { EmailLayout, InfoRow } from "./components/layout";

export interface BookingRequestAdminNotificationProps {
  orgName: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string;
  roomNames: string[];
  dateRangeLabel: string;
  message?: string;
  isSeries: boolean;
  reviewUrl: string;
}

export default function BookingRequestAdminNotification({
  orgName,
  requesterName,
  requesterEmail,
  requesterPhone,
  roomNames,
  dateRangeLabel,
  message,
  isSeries,
  reviewUrl,
}: BookingRequestAdminNotificationProps) {
  return (
    <EmailLayout
      orgName={orgName}
      preview={`Neue ${isSeries ? "Serien-" : ""}Anfrage von ${requesterName}`}
      heading={`Neue ${isSeries ? "Terminserien-" : "Raum-"}Anfrage`}
    >
      <Text style={{ fontSize: 14 }}>
        Es ist eine neue {isSeries ? "Serienanfrage" : "Anfrage"} über das öffentliche Formular
        eingegangen.
      </Text>
      <Section style={{ margin: "16px 0" }}>
        <InfoRow label="Name" value={requesterName} />
        <InfoRow label="E-Mail" value={requesterEmail} />
        {requesterPhone ? <InfoRow label="Telefon" value={requesterPhone} /> : null}
        <InfoRow label="Räume" value={roomNames.join(", ")} />
        <InfoRow label={isSeries ? "Zeitraum/Serie" : "Termin"} value={dateRangeLabel} />
        {message ? <InfoRow label="Nachricht" value={message} /> : null}
      </Section>
      <Button
        href={reviewUrl}
        style={{
          backgroundColor: "#18181b",
          color: "#ffffff",
          padding: "10px 18px",
          borderRadius: 6,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        Anfrage prüfen
      </Button>
    </EmailLayout>
  );
}
