"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Tabellenzeile, die als Ganzes zum Ziel navigiert (Zellen bleiben Server-Markup). */
export function ClickableRow({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <TableRow className={cn("cursor-pointer", className)} onClick={() => router.push(href)}>
      {children}
    </TableRow>
  );
}
