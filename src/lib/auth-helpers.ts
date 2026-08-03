import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/kalender");
  return user;
}

/** Für Gruppen-User: liefert die eigene Gruppen-ID oder wirft (Admins haben keine Gruppe). */
export async function requireGruppenUser() {
  const user = await requireUser();
  if (!user.gruppeId) redirect("/kalender");
  return { ...user, gruppeId: user.gruppeId };
}
