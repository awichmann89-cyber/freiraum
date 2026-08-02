import "server-only";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export type AuditEntityType = "booking" | "booking_series" | "contract" | "user" | "floorplan";

export interface LogAuditParams {
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actorUserId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  await db.insert(auditLog).values({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorUserId: params.actorUserId ?? null,
    ipAddress: params.ipAddress ?? null,
    metadata: params.metadata ?? null,
  });
}
