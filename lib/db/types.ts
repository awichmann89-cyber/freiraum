import type { InferSelectModel } from "drizzle-orm";
import type {
  users,
  rooms,
  bookingSeries,
  bookings,
  contracts,
  floorplans,
  floorplanHotspots,
  settings,
  auditLog,
} from "./schema";

export type User = InferSelectModel<typeof users>;
export type Room = InferSelectModel<typeof rooms>;
export type BookingSeries = InferSelectModel<typeof bookingSeries>;
export type Booking = InferSelectModel<typeof bookings>;
export type Contract = InferSelectModel<typeof contracts>;
export type Floorplan = InferSelectModel<typeof floorplans>;
export type FloorplanHotspot = InferSelectModel<typeof floorplanHotspots>;
export type Settings = InferSelectModel<typeof settings>;
export type AuditLogEntry = InferSelectModel<typeof auditLog>;
