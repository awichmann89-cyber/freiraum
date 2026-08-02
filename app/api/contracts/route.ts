import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  bookings,
  bookingRooms,
  bookingSeries,
  bookingSeriesRooms,
  contracts,
  rooms,
  settings,
} from "@/lib/db/schema";
import { requireAdmin, isResponse } from "@/lib/api-auth";
import { renderContractPdf } from "@/lib/pdf/contract-template";
import { generateSigningToken } from "@/lib/contract-token";
import { formatDateTimeRange, formatDate } from "@/lib/format";
import { describeStoredRRule } from "@/lib/recurrence-label";
import { sendContractSigningLink } from "@/lib/email/contract";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request-ip";

const SIGNING_LINK_EXPIRY_DAYS = 14;

const createContractSchema = z
  .object({
    bookingId: z.uuid().optional(),
    seriesId: z.uuid().optional(),
    priceNote: z.string().max(4000).optional(),
  })
  .refine((d) => (d.bookingId ? 1 : 0) + (d.seriesId ? 1 : 0) === 1, {
    message: "Entweder bookingId oder seriesId angeben.",
  });

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isResponse(authResult)) return authResult;
  const session = authResult;

  const body = await request.json();
  const parsed = createContractSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [settingsRow] = await db.select().from(settings).limit(1);
  if (!settingsRow) {
    return NextResponse.json({ error: "Einstellungen sind nicht konfiguriert." }, { status: 500 });
  }

  let renterName: string;
  let renterEmail: string;
  let renterPhone: string | null;
  let roomNames: string[];
  let scheduleLabel: string;

  if (parsed.data.bookingId) {
    const bookingId = parsed.data.bookingId;
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking) {
      return NextResponse.json({ error: "Anfrage nicht gefunden." }, { status: 404 });
    }
    if (booking.type !== "external_rental") {
      return NextResponse.json(
        { error: "Verträge sind nur für Vermietungen möglich." },
        { status: 400 }
      );
    }
    if (booking.status !== "approved") {
      return NextResponse.json({ error: "Die Anfrage muss zuerst freigegeben werden." }, { status: 400 });
    }
    const [existing] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.bookingId, bookingId))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { error: "Für diese Anfrage existiert bereits ein Vertrag." },
        { status: 409 }
      );
    }

    const roomRows = await db
      .select({ name: rooms.name })
      .from(bookingRooms)
      .innerJoin(rooms, eq(bookingRooms.roomId, rooms.id))
      .where(eq(bookingRooms.bookingId, bookingId));

    renterName = booking.requesterName ?? "";
    renterEmail = booking.requesterEmail ?? "";
    renterPhone = booking.requesterPhone;
    roomNames = roomRows.map((r) => r.name);
    scheduleLabel = formatDateTimeRange(booking.startAt, booking.endAt);
  } else {
    const seriesId = parsed.data.seriesId!;
    const [series] = await db
      .select()
      .from(bookingSeries)
      .where(eq(bookingSeries.id, seriesId))
      .limit(1);
    if (!series) {
      return NextResponse.json({ error: "Serie nicht gefunden." }, { status: 404 });
    }
    if (series.type !== "external_rental") {
      return NextResponse.json(
        { error: "Verträge sind nur für Vermietungen möglich." },
        { status: 400 }
      );
    }
    if (series.status !== "approved") {
      return NextResponse.json({ error: "Die Serie muss zuerst freigegeben werden." }, { status: 400 });
    }
    const [existing] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.seriesId, seriesId))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { error: "Für diese Serie existiert bereits ein Vertrag." },
        { status: 409 }
      );
    }

    const roomRows = await db
      .select({ name: rooms.name })
      .from(bookingSeriesRooms)
      .innerJoin(rooms, eq(bookingSeriesRooms.roomId, rooms.id))
      .where(eq(bookingSeriesRooms.seriesId, seriesId));

    renterName = series.requesterName ?? "";
    renterEmail = series.requesterEmail ?? "";
    renterPhone = series.requesterPhone;
    roomNames = roomRows.map((r) => r.name);
    scheduleLabel = describeStoredRRule(
      series.rrule,
      series.seriesStartDate,
      series.seriesEndDate,
      series.startTime.slice(0, 5),
      series.endTime.slice(0, 5)
    );
  }

  const { token, hash } = generateSigningToken();
  const expiresAt = new Date(Date.now() + SIGNING_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const [contract] = await db
    .insert(contracts)
    .values({
      bookingId: parsed.data.bookingId ?? null,
      seriesId: parsed.data.seriesId ?? null,
      status: "sent",
      priceNote: parsed.data.priceNote || null,
      signingTokenHash: hash,
      signingTokenExpiresAt: expiresAt,
      sentAt: new Date(),
    })
    .returning();

  const pdfBuffer = await renderContractPdf({
    orgName: settingsRow.orgName,
    orgAddress: settingsRow.orgAddress,
    footerText: settingsRow.contractFooterText,
    renterName,
    renterEmail,
    renterPhone,
    roomNames,
    scheduleLabel,
    priceNote: parsed.data.priceNote,
    contractId: contract.id,
    createdDateLabel: formatDate(new Date()),
  });

  const blob = await put(`contracts/${contract.id}/unsigned.pdf`, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
  });

  await db.update(contracts).set({ unsignedPdfUrl: blob.url }).where(eq(contracts.id, contract.id));

  if (parsed.data.bookingId) {
    await db
      .update(bookings)
      .set({ status: "contract_sent", updatedAt: new Date() })
      .where(eq(bookings.id, parsed.data.bookingId));
  } else {
    await db
      .update(bookings)
      .set({ status: "contract_sent", updatedAt: new Date() })
      .where(eq(bookings.seriesId, parsed.data.seriesId!));
  }

  await sendContractSigningLink({
    requesterEmail: renterEmail,
    requesterName: renterName,
    roomNames,
    dateRangeLabel: scheduleLabel,
    token,
    expiresAtLabel: formatDate(expiresAt),
  });

  await logAudit({
    entityType: "contract",
    entityId: contract.id,
    action: "sent",
    actorUserId: session.user.id,
    ipAddress: getClientIp(request),
  });

  return NextResponse.json({ id: contract.id }, { status: 201 });
}
