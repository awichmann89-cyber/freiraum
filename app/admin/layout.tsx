import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/anfragen", label: "Anfragen" },
  { href: "/admin/kalender", label: "Kalender" },
  { href: "/admin/vertraege", label: "Verträge" },
  { href: "/admin/raeume", label: "Räume" },
  { href: "/admin/lageplan", label: "Lageplan" },
  { href: "/admin/gruppen", label: "Gruppen" },
  { href: "/admin/einstellungen", label: "Einstellungen" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }
  if (session.user.role !== "admin") {
    redirect("/nicht-berechtigt");
  }
  if (session.user.mustChangePassword) {
    redirect("/passwort-aendern");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="font-semibold">
              Freiraum Admin
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline" size="sm">
                  Abmelden
                </Button>
              </form>
            </div>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
