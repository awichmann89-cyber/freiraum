"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Übersicht", exact: true },
  { href: "/admin/anfragen", label: "Anfragen" },
  { href: "/admin/vermietungen", label: "Vermietungen" },
  { href: "/admin/raeume", label: "Räume" },
  { href: "/admin/etagen", label: "Etagen" },
  { href: "/admin/gruppen", label: "Gruppen" },
  { href: "/admin/einstellungen", label: "Einstellungen" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 overflow-x-auto px-4">
      <div className="flex w-max gap-1 rounded-lg bg-muted p-1">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
