export const BOOKING_STATUS_LABELS = {
  requested: "Angefragt",
  in_review: "In Prüfung",
  approved: "Freigegeben",
  contract_sent: "Vertrag versendet",
  confirmed: "Bestätigt",
  rejected: "Abgelehnt",
  cancelled: "Storniert",
} as const;

export const SERIES_STATUS_LABELS = {
  requested: "Angefragt",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
  cancelled: "Storniert",
} as const;

export const BOOKING_TYPE_LABELS = {
  external_rental: "Vermietung",
  group: "Gruppe",
} as const;

export const CONTRACT_STATUS_LABELS = {
  draft: "Entwurf",
  sent: "Versendet",
  signed: "Unterschrieben",
  voided: "Ungültig",
} as const;
