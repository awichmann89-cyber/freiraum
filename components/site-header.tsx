import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function SiteHeader() {
  const session = await auth();

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="font-semibold">
          Freiraum
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/anfrage" className="hover:underline">
            Anfrage stellen
          </Link>
          <Link href="/kalender" className="hover:underline">
            Kalender
          </Link>
          {session?.user ? (
            <>
              <Link
                href={session.user.role === "admin" ? "/admin" : "/gruppe"}
                className="hover:underline"
              >
                Mein Bereich
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
            </>
          ) : (
            <Button render={<Link href="/login" />} size="sm">
              Anmelden
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
