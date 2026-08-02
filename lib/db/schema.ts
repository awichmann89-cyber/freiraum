import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  time,
  date,
  primaryKey,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["admin", "group"]);
export const bookingType = pgEnum("booking_type", ["external_rental", "group"]);
export const bookingStatus = pgEnum("booking_status", [
  "requested",
  "in_review",
  "approved",
  "contract_sent",
  "confirmed",
  "rejected",
  "cancelled",
]);
export const seriesStatus = pgEnum("series_status", [
  "requested",
  "approved",
  "rejected",
  "cancelled",
]);
export const contractStatus = pgEnum("contract_status", [
  "draft",
  "sent",
  "signed",
  "voided",
]);
export const hotspotShape = pgEnum("hotspot_shape", ["rect", "polygon"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull(),
  displayName: text("display_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  capacity: integer("capacity"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookingSeries = pgTable("booking_series", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: bookingType("type").notNull(),
  rrule: text("rrule").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  seriesStartDate: date("series_start_date").notNull(),
  seriesEndDate: date("series_end_date").notNull(),
  requesterName: text("requester_name"),
  requesterEmail: text("requester_email"),
  requesterPhone: text("requester_phone"),
  createdByUserId: uuid("created_by_user_id").references(() => users.id),
  message: text("message"),
  status: seriesStatus("status").notNull().default("requested"),
  reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookingSeriesRooms = pgTable(
  "booking_series_rooms",
  {
    seriesId: uuid("series_id")
      .notNull()
      .references(() => bookingSeries.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id),
  },
  (t) => [primaryKey({ columns: [t.seriesId, t.roomId] })]
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seriesId: uuid("series_id").references(() => bookingSeries.id, {
      onDelete: "set null",
    }),
    isSeriesException: boolean("is_series_exception").notNull().default(false),
    type: bookingType("type").notNull(),
    status: bookingStatus("status").notNull().default("requested"),
    requesterName: text("requester_name"),
    requesterEmail: text("requester_email"),
    requesterPhone: text("requester_phone"),
    message: text("message"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    adminNotes: text("admin_notes"),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_start_end_idx").on(t.startAt, t.endAt),
    index("bookings_status_idx").on(t.status),
    index("bookings_series_idx").on(t.seriesId),
  ]
);

export const bookingRooms = pgTable(
  "booking_rooms",
  {
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    roomId: uuid("room_id")
      .notNull()
      .references(() => rooms.id),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.roomId] })]
);

export const contracts = pgTable(
  "contracts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .references(() => bookings.id)
      .unique(),
    seriesId: uuid("series_id")
      .references(() => bookingSeries.id)
      .unique(),
    status: contractStatus("status").notNull().default("draft"),
    unsignedPdfUrl: text("unsigned_pdf_url"),
    signedPdfUrl: text("signed_pdf_url"),
    /**
     * Long-lived capability token for viewing/downloading the contract PDF
     * through the blob-proxy route (the underlying Blob store is private).
     * Stored as plaintext, unlike signingTokenHash: this only grants read
     * access to a PDF already being emailed to that same recipient, not an
     * elevated action, so it doesn't need hash-then-compare semantics.
     */
    pdfAccessToken: text("pdf_access_token").notNull().unique(),
    signingTokenHash: text("signing_token_hash").unique(),
    signingTokenExpiresAt: timestamp("signing_token_expires_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    signerName: text("signer_name"),
    signerIpAddress: text("signer_ip_address"),
    priceNote: text("price_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "contract_booking_xor_series",
      sql`(${t.bookingId} is not null and ${t.seriesId} is null) or (${t.bookingId} is null and ${t.seriesId} is not null)`
    ),
  ]
);

export const floorplans = pgTable("floorplans", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageUrl: text("image_url").notNull(),
  imageWidth: integer("image_width").notNull(),
  imageHeight: integer("image_height").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const floorplanHotspots = pgTable("floorplan_hotspots", {
  id: uuid("id").primaryKey().defaultRandom(),
  floorplanId: uuid("floorplan_id")
    .notNull()
    .references(() => floorplans.id, { onDelete: "cascade" }),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id),
  shape: hotspotShape("shape").notNull(),
  coordinates: jsonb("coordinates").notNull().$type<{ x: number; y: number }[]>(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  adminNotificationEmail: text("admin_notification_email").notNull(),
  senderEmail: text("sender_email").notNull(),
  senderName: text("sender_name").notNull(),
  orgName: text("org_name").notNull(),
  orgAddress: text("org_address"),
  contractFooterText: text("contract_footer_text"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  ipAddress: text("ip_address"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Relations

export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  bookingSeries: many(bookingSeries),
}));

export const roomsRelations = relations(rooms, ({ many }) => ({
  bookingRooms: many(bookingRooms),
  bookingSeriesRooms: many(bookingSeriesRooms),
  hotspots: many(floorplanHotspots),
}));

export const bookingSeriesRelations = relations(bookingSeries, ({ many, one }) => ({
  occurrences: many(bookings),
  rooms: many(bookingSeriesRooms),
  contract: one(contracts, {
    fields: [bookingSeries.id],
    references: [contracts.seriesId],
  }),
  createdByUser: one(users, {
    fields: [bookingSeries.createdByUserId],
    references: [users.id],
  }),
}));

export const bookingSeriesRoomsRelations = relations(bookingSeriesRooms, ({ one }) => ({
  series: one(bookingSeries, {
    fields: [bookingSeriesRooms.seriesId],
    references: [bookingSeries.id],
  }),
  room: one(rooms, {
    fields: [bookingSeriesRooms.roomId],
    references: [rooms.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ many, one }) => ({
  rooms: many(bookingRooms),
  series: one(bookingSeries, {
    fields: [bookings.seriesId],
    references: [bookingSeries.id],
  }),
  contract: one(contracts, {
    fields: [bookings.id],
    references: [contracts.bookingId],
  }),
  createdByUser: one(users, {
    fields: [bookings.createdByUserId],
    references: [users.id],
  }),
}));

export const bookingRoomsRelations = relations(bookingRooms, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingRooms.bookingId],
    references: [bookings.id],
  }),
  room: one(rooms, {
    fields: [bookingRooms.roomId],
    references: [rooms.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  booking: one(bookings, {
    fields: [contracts.bookingId],
    references: [bookings.id],
  }),
  series: one(bookingSeries, {
    fields: [contracts.seriesId],
    references: [bookingSeries.id],
  }),
}));

export const floorplansRelations = relations(floorplans, ({ many }) => ({
  hotspots: many(floorplanHotspots),
}));

export const floorplanHotspotsRelations = relations(floorplanHotspots, ({ one }) => ({
  floorplan: one(floorplans, {
    fields: [floorplanHotspots.floorplanId],
    references: [floorplans.id],
  }),
  room: one(rooms, {
    fields: [floorplanHotspots.roomId],
    references: [rooms.id],
  }),
}));
