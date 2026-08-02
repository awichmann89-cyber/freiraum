import { Body, Container, Head, Heading, Html, Hr, Preview, Text } from "@react-email/components";

export function EmailLayout({
  preview,
  heading,
  orgName,
  children,
}: {
  preview: string;
  heading: string;
  orgName: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="de">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ fontFamily: "Helvetica, Arial, sans-serif", backgroundColor: "#f4f4f5", padding: "24px 0" }}>
        <Container
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            padding: 24,
            maxWidth: 560,
          }}
        >
          <Heading as="h2" style={{ fontSize: 20, marginBottom: 16 }}>
            {heading}
          </Heading>
          {children}
          <Hr style={{ borderColor: "#e4e4e7", margin: "24px 0 12px" }} />
          <Text style={{ fontSize: 12, color: "#71717a" }}>{orgName}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ fontSize: 14, margin: "4px 0" }}>
      <strong>{label}:</strong> {value}
    </Text>
  );
}
