import { requireAdmin } from "@/lib/auth-helpers";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // zweite Verteidigungslinie neben proxy.ts

  return (
    <div className="space-y-4">
      <AdminNav />
      {children}
    </div>
  );
}
