"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Floorplan, FloorplanHotspot, Room } from "@/lib/db/types";
import { type Point, rectStyle } from "@/lib/floorplan-geometry";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface DraftRect {
  start: Point;
  end: Point;
}

export function FloorplanEditor({
  floorplan,
  hotspots,
  rooms,
}: {
  floorplan: Floorplan;
  hotspots: FloorplanHotspot[];
  rooms: Room[];
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<DraftRect | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function pointFromEvent(e: React.MouseEvent): Point {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-hotspot]")) return;
    const point = pointFromEvent(e);
    setDraft({ start: point, end: point });
    setDragging(true);
    setPendingRoomId("");
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragging || !draft) return;
    setDraft({ ...draft, end: pointFromEvent(e) });
  }

  function handleMouseUp() {
    if (!dragging) return;
    setDragging(false);
    if (!draft) return;
    const width = Math.abs(draft.start.x - draft.end.x);
    const height = Math.abs(draft.start.y - draft.end.y);
    if (width < 1.5 || height < 1.5) {
      setDraft(null);
    }
  }

  async function saveDraft() {
    if (!draft || !pendingRoomId) return;
    setSaving(true);
    const res = await fetch("/api/floorplans/hotspots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        floorplanId: floorplan.id,
        roomId: pendingRoomId,
        shape: "rect",
        coordinates: [draft.start, draft.end],
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error ?? "Bereich konnte nicht gespeichert werden.");
      return;
    }
    toast.success("Bereich gespeichert.");
    setDraft(null);
    setPendingRoomId("");
    router.refresh();
  }

  async function deleteHotspot(id: string) {
    if (!confirm("Diesen Bereich wirklich löschen?")) return;
    const res = await fetch(`/api/floorplans/hotspots/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Löschen fehlgeschlagen.");
      return;
    }
    toast.success("Bereich gelöscht.");
    router.refresh();
  }

  const assignedRoomIds = new Set(hotspots.map((h) => h.roomId));
  const unassignedRooms = rooms.filter((r) => !assignedRoomIds.has(r.id));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Klicken und ziehen Sie auf dem Bild, um einen neuen klickbaren Bereich für einen Raum zu
        markieren.
      </p>
      <div
        ref={containerRef}
        className="relative w-full select-none overflow-hidden rounded-md border"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => dragging && handleMouseUp()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={floorplan.imageUrl}
          alt="Lageplan"
          className="block w-full h-auto pointer-events-none"
          draggable={false}
        />
        {hotspots.map((h) => {
          const [a, b] = h.coordinates as Point[];
          const room = rooms.find((r) => r.id === h.roomId);
          return (
            <div
              key={h.id}
              data-hotspot
              className="absolute flex items-center justify-center bg-primary/20 border-2 border-primary text-xs font-medium text-primary"
              style={rectStyle(a, b)}
            >
              <span className="bg-background/80 px-1 rounded">{room?.name ?? "?"}</span>
            </div>
          );
        })}
        {draft ? (
          <div
            className="absolute border-2 border-dashed border-foreground bg-foreground/10"
            style={rectStyle(draft.start, draft.end)}
          />
        ) : null}
      </div>

      {draft && !dragging ? (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 pt-6">
            <span className="text-sm">Neuer Bereich – Raum zuordnen:</span>
            <Select value={pendingRoomId} onValueChange={(v) => setPendingRoomId(v ?? "")}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Raum wählen" />
              </SelectTrigger>
              <SelectContent>
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!pendingRoomId || saving} onClick={saveDraft}>
              {saving ? "Speichern…" : "Speichern"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>
              Abbrechen
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        <h3 className="font-medium">Zugeordnete Bereiche</h3>
        {hotspots.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Bereiche markiert.</p>
        ) : (
          <ul className="space-y-1">
            {hotspots.map((h) => {
              const room = rooms.find((r) => r.id === h.roomId);
              return (
                <li key={h.id} className="flex items-center justify-between text-sm">
                  <span>{room?.name ?? "Unbekannter Raum"}</span>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteHotspot(h.id)}
                  >
                    Löschen
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        {unassignedRooms.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Noch ohne Bereich: {unassignedRooms.map((r) => r.name).join(", ")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
