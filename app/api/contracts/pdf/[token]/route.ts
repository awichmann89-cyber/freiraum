import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contracts } from "@/lib/db/schema";
import { getPrivateBlob } from "@/lib/blob-storage";

/**
 * Token-gated proxy for contract PDFs (unsigned during the signing window,
 * signed afterwards). The Blob store is private; this is the only way
 * renters (who have no account) or admins can view/download the PDF.
 * Serves whichever variant currently exists, preferring the signed one.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.pdfAccessToken, token))
    .limit(1);
  if (!contract) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  const blobUrl = contract.signedPdfUrl ?? contract.unsignedPdfUrl;
  if (!blobUrl) {
    return NextResponse.json({ error: "Der Vertrag ist noch nicht verfügbar." }, { status: 404 });
  }

  const result = await getPrivateBlob(blobUrl);
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "PDF konnte nicht geladen werden." }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="vertrag-${contract.id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
