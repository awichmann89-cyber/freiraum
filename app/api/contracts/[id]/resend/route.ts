import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contracts } from "@/lib/db/schema";
import { requireAdmin, isResponse } from "@/lib/api-auth";
import { getContractContext } from "@/lib/queries/contracts";
import { generateSigningToken } from "@/lib/contract-token";
import { formatDate } from "@/lib/format";
import { sendContractSigningLink } from "@/lib/email/contract";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-ip";

const SIGNING_LINK_EXPIRY_DAYS = 14;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;
  const session = authResult;
  const { id } = await params;

  const [contract] = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
  if (!contract) {
    return NextResponse.json({ error: "Vertrag nicht gefunden." }, { status: 404 });
  }
  if (contract.status !== "sent") {
    return NextResponse.json(
      { error: "Nur Verträge, die auf Unterschrift warten, können erneut versendet werden." },
      { status: 400 }
    );
  }

  const context = await getContractContext(contract);
  if (!context) {
    return NextResponse.json({ error: "Zugehörige Buchung nicht gefunden." }, { status: 404 });
  }

  const { token, hash } = generateSigningToken();
  const expiresAt = new Date(Date.now() + SIGNING_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db
    .update(contracts)
    .set({ signingTokenHash: hash, signingTokenExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(contracts.id, id));

  await sendContractSigningLink({
    requesterEmail: context.renterEmail,
    requesterName: context.renterName,
    roomNames: context.roomNames,
    dateRangeLabel: context.scheduleLabel,
    token,
    expiresAtLabel: formatDate(expiresAt),
  });

  await logAudit({
    entityType: "contract",
    entityId: id,
    action: "resent",
    actorUserId: session.user.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ success: true });
}
