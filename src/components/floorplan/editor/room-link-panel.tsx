"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function RoomLinkPanel({
  raeume,
  usedRaumIds,
  selectedRaumId,
  onRaumChange,
  onDelete,
}: {
  raeume: { id: string; name: string }[];
  usedRaumIds: Set<string>; // von anderen Formen belegt
  selectedRaumId: string | null;
  onRaumChange: (raumId: string) => void;
  onDelete: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Ausgewählte Form</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Verknüpfter Raum</Label>
          <Select value={selectedRaumId ?? ""} onValueChange={onRaumChange}>
            <SelectTrigger>
              <SelectValue placeholder="Raum wählen…" />
            </SelectTrigger>
            <SelectContent>
              {raeume.map((r) => {
                const taken = usedRaumIds.has(r.id) && r.id !== selectedRaumId;
                return (
                  <SelectItem key={r.id} value={r.id} disabled={taken}>
                    {r.name}
                    {taken ? " (bereits verknüpft)" : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {!selectedRaumId ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Ohne Raum-Verknüpfung kann die Form nicht gespeichert werden.
            </p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="size-4" /> Form löschen
        </Button>
      </CardContent>
    </Card>
  );
}
