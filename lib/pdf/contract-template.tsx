import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.4 },
  h1: { fontSize: 18, marginBottom: 20, fontWeight: 700 },
  section: { marginBottom: 14 },
  label: { fontWeight: 700 },
  row: { marginBottom: 3 },
  signatureBox: { marginTop: 8, borderTop: "1px solid #d4d4d8", paddingTop: 8 },
  signatureImg: { width: 220, height: 90, objectFit: "contain" },
  footer: {
    marginTop: 32,
    paddingTop: 12,
    borderTop: "1px solid #e4e4e7",
    fontSize: 8,
    color: "#71717a",
  },
});

export interface ContractDocumentProps {
  orgName: string;
  orgAddress?: string | null;
  footerText?: string | null;
  renterName: string;
  renterEmail: string;
  renterPhone?: string | null;
  roomNames: string[];
  scheduleLabel: string;
  priceNote?: string | null;
  contractId: string;
  createdDateLabel: string;
  signature?: {
    imageDataUrl: string;
    signerName: string;
    signedAtLabel: string;
  } | null;
}

export function ContractDocument({
  orgName,
  orgAddress,
  footerText,
  renterName,
  renterEmail,
  renterPhone,
  roomNames,
  scheduleLabel,
  priceNote,
  contractId,
  createdDateLabel,
  signature,
}: ContractDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Mietvertrag Raumnutzung</Text>

        <View style={styles.section}>
          <Text style={styles.row}>
            <Text style={styles.label}>Vermieter: </Text>
            {orgName}
            {orgAddress ? `, ${orgAddress}` : ""}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Mieter: </Text>
            {renterName}, {renterEmail}
            {renterPhone ? `, ${renterPhone}` : ""}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.row}>
            <Text style={styles.label}>Räume: </Text>
            {roomNames.join(", ")}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Zeitraum: </Text>
            {scheduleLabel}
          </Text>
          {priceNote ? (
            <Text style={styles.row}>
              <Text style={styles.label}>Konditionen: </Text>
              {priceNote}
            </Text>
          ) : null}
        </View>

        {footerText ? (
          <View style={styles.section}>
            <Text>{footerText}</Text>
          </View>
        ) : null}

        <View style={styles.signatureBox}>
          <Text style={styles.label}>Unterschrift Mieter:in</Text>
          {signature ? (
            <>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={signature.imageDataUrl} style={styles.signatureImg} />
              <Text>
                {signature.signerName} · online unterschrieben am {signature.signedAtLabel}
              </Text>
            </>
          ) : (
            <Text>Noch nicht unterschrieben.</Text>
          )}
        </View>

        <Text style={styles.footer}>
          Vertrags-ID: {contractId} · Erstellt am {createdDateLabel}
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Renders the contract to a PDF buffer. Kept in this .tsx module (rather than
 * called inline from route handlers) so route handler files can stay plain
 * .ts — mixing JSX into a route handler file confuses the React Compiler
 * ESLint plugin's component heuristic and produces false-positive purity
 * errors on unrelated code in the same file.
 */
export function renderContractPdf(props: ContractDocumentProps): Promise<Buffer> {
  return renderToBuffer(<ContractDocument {...props} />);
}
