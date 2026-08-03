import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CalendarNav({
  label,
  prevHref,
  nextHref,
  todayHref,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" asChild>
        <Link href={prevHref} aria-label="Zurück">
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={todayHref}>Heute</Link>
      </Button>
      <Button variant="outline" size="icon-sm" asChild>
        <Link href={nextHref} aria-label="Weiter">
          <ChevronRight className="size-4" />
        </Link>
      </Button>
      <span className="ml-1 text-sm font-medium">{label}</span>
    </div>
  );
}
