import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/gruppe", label: "Meine Termine" },
  { href: "/gruppe/neue-buchung", label: "Neue Buchung" },
  { href: "/gruppe/kalender", label: "Kalender & Lageplan" },
];

export default async function GruppeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/gruppe");
  }
  if (session.user.role !== "group") {
    // Admins have their own equivalent views (/admin/kalender, /admin/anfragen)
    // — the group self-service booking form assumes a group session (no
    // separate contact fields, room booking always tied to createdByUserId),
    // which doesn't map cleanly onto an admin account.
    redirect("/nicht-berechtigt");
  }
  if (session.user.mustChangePassword) {
    redirect("/passwort-aendern");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/gruppe" className="font-semibold">
              Freiraum – {session.user.name}
            </Link>
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
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
