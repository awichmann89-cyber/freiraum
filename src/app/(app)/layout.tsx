import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const gruppe = user.gruppeId
    ? await prisma.gruppe.findUnique({ where: { id: user.gruppeId }, select: { name: true } })
    : null;

  return (
    <AppShell
      user={{
        name: user.name ?? "",
        isAdmin: user.role === "ADMIN",
        gruppeName: gruppe?.name ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
