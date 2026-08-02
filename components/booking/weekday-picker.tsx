import type { WeekdayCode } from "@/lib/series/expand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS: { code: WeekdayCode; label: string }[] = [
  { code: "MO", label: "Mo" },
  { code: "TU", label: "Di" },
  { code: "WE", label: "Mi" },
  { code: "TH", label: "Do" },
  { code: "FR", label: "Fr" },
  { code: "SA", label: "Sa" },
  { code: "SU", label: "So" },
];

export function WeekdayPicker({
  value,
  onChange,
}: {
  value: WeekdayCode[];
  onChange: (weekdays: WeekdayCode[]) => void;
}) {
  function toggle(code: WeekdayCode) {
    if (value.includes(code)) {
      onChange(value.filter((d) => d !== code));
    } else {
      onChange([...value, code]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {WEEKDAYS.map((day) => {
        const active = value.includes(day.code);
        return (
          <Button
            key={day.code}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            className={cn("w-10")}
            onClick={() => toggle(day.code)}
          >
            {day.label}
          </Button>
        );
      })}
    </div>
  );
}
