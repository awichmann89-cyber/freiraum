import "server-only";
import { sendEmail, getSenderSettings } from "./send";
import BookingRequestAdminNotification from "@/emails/booking-request-admin-notification";
import BookingRequestConfirmation from "@/emails/booking-request-confirmation";
import BookingStatusUpdate from "@/emails/booking-status-update";
import { APP_BASE_URL } from "@/lib/app-url";

interface NewBookingNotificationParams {
  requesterName: string;
  requesterEmail: string;
  requesterPhone?: string | null;
  roomNames: string[];
  message?: string | null;
  isSeries: boolean;
  reviewPath: string;
  dateRangeLabel: string;
}

export async function notifyAdminOfNewBooking(params: NewBookingNotificationParams): Promise<void> {
  const senderSettings = await getSenderSettings();
  await sendEmail({
    to: senderSettings.adminNotificationEmail,
    subject: `Neue ${params.isSeries ? "Serien-" : ""}Anfrage: ${params.requesterName}`,
    react: (
      <BookingRequestAdminNotification
        orgName={senderSettings.orgName}
        requesterName={params.requesterName}
        requesterEmail={params.requesterEmail}
        requesterPhone={params.requesterPhone ?? undefined}
        roomNames={params.roomNames}
        dateRangeLabel={params.dateRangeLabel}
        message={params.message ?? undefined}
        isSeries={params.isSeries}
        reviewUrl={`${APP_BASE_URL}${params.reviewPath}`}
      />
    ),
  });
}

interface BookingConfirmationParams {
  requesterEmail: string;
  requesterName: string;
  roomNames: string[];
  dateRangeLabel: string;
  isSeries: boolean;
}

export async function sendBookingRequestConfirmation(
  params: BookingConfirmationParams
): Promise<void> {
  const senderSettings = await getSenderSettings();
  await sendEmail({
    to: params.requesterEmail,
    subject: "Ihre Anfrage ist eingegangen",
    react: (
      <BookingRequestConfirmation
        orgName={senderSettings.orgName}
        requesterName={params.requesterName}
        roomNames={params.roomNames}
        dateRangeLabel={params.dateRangeLabel}
        isSeries={params.isSeries}
      />
    ),
  });
}

interface BookingStatusUpdateParams {
  requesterEmail: string;
  requesterName: string;
  roomNames: string[];
  dateRangeLabel: string;
  statusLabel: string;
  statusIsPositive: boolean;
  adminNote?: string | null;
}

export async function sendBookingStatusUpdate(params: BookingStatusUpdateParams): Promise<void> {
  const senderSettings = await getSenderSettings();
  await sendEmail({
    to: params.requesterEmail,
    subject: `Ihre Anfrage: ${params.statusLabel}`,
    react: (
      <BookingStatusUpdate
        orgName={senderSettings.orgName}
        requesterName={params.requesterName}
        roomNames={params.roomNames}
        dateRangeLabel={params.dateRangeLabel}
        statusLabel={params.statusLabel}
        statusIsPositive={params.statusIsPositive}
        adminNote={params.adminNote ?? undefined}
      />
    ),
  });
}
