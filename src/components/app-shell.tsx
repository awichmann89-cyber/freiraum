"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CirclePlus, Map, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/(app)/nav-actions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/kalender", label: "Kalender", icon: CalendarDays },
  { href: "/etagen", label: "Etagen", icon: Map },
  { href: "/buchen", label: "Buchen", icon: CirclePlus },
  { href: "/admin", label: "Admin", icon: Settings, adminOnly: true },
];

export function AppShell({
  user,
  children,
}: {
  user: { name: string; isAdmin: boolean; gruppeName?: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || user.isAdmin);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-4">
          <Link href="/kalender" className="text-lg font-semibold tracking-tight">
            Freiraum
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right text-sm sm:block">
              <div className="font-medium leading-tight">{user.name}</div>
              {user.gruppeName ? (
                <div className="text-xs leading-tight text-muted-foreground">{user.gruppeName}</div>
              ) : null}
            </div>
            <form action={logoutAction}>
              <Button variant="ghost" size="icon" type="submit" title="Abmelden">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 pb-20 md:pb-6">{children}</main>

      {/* Mobile Bottom-Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden">
        <div className="grid auto-cols-fr grid-flow-col">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px]",
                  isActive(item.href) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
