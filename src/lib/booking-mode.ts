import { prisma } from "@/lib/prisma";
import type { BookingMode } from "@/components/calendar/booking-dialog";

/** Buchungs-Modus für die Kalender-Ansichten: Admin trägt direkt ein, Gruppen fragen an. */
export async function bookingModeForUser(user: {
  role: string;
  gruppeId: string | null;
}): Promise<BookingMode | null> {
  if (user.role === "ADMIN") {
    const gruppen = await prisma.gruppe.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return { mode: "admin", gruppen };
  }
  return user.gruppeId ? { mode: "gruppe" } : null;
}
