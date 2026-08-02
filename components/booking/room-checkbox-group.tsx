import type { Room } from "@/lib/db/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function RoomCheckboxGroup({
  rooms,
  value,
  onChange,
}: {
  rooms: Room[];
  value: string[];
  onChange: (roomIds: string[]) => void;
}) {
  function toggle(roomId: string, checked: boolean) {
    if (checked) {
      onChange([...value, roomId]);
    } else {
      onChange(value.filter((id) => id !== roomId));
    }
  }

  return (
    <div className="space-y-2">
      {rooms.map((room) => (
        <div key={room.id} className="flex items-center gap-2">
          <Checkbox
            id={`room-${room.id}`}
            checked={value.includes(room.id)}
            onCheckedChange={(checked) => toggle(room.id, checked)}
          />
          <Label htmlFor={`room-${room.id}`} className="font-normal">
            {room.name}
            {room.capacity ? (
              <span className="text-muted-foreground"> (bis {room.capacity} Personen)</span>
            ) : null}
          </Label>
        </div>
      ))}
      {rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aktuell sind keine Räume verfügbar.</p>
      ) : null}
    </div>
  );
}
