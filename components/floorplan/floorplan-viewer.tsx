"use client";

import { useRouter } from "next/navigation";
import type { Floorplan, FloorplanHotspot, Room } from "@/lib/db/types";
import { type Point, rectStyle } from "@/lib/floorplan-geometry";

export function FloorplanViewer({
  floorplan,
  hotspots,
  rooms,
  basePath = "/kalender",
}: {
  floorplan: Floorplan;
  hotspots: FloorplanHotspot[];
  rooms: Room[];
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <div className="relative w-full overflow-hidden rounded-md border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/floorplans/${floorplan.id}/image`}
        alt="Lageplan"
        className="block w-full h-auto"
      />
      {hotspots.map((hotspot) => {
        const [a, b] = hotspot.coordinates as Point[];
        const room = rooms.find((r) => r.id === hotspot.roomId);
        if (!room) return null;
        return (
          <button
            key={hotspot.id}
            type="button"
            className="absolute flex items-end justify-center border-2 border-transparent transition-colors hover:border-primary hover:bg-primary/10"
            style={rectStyle(a, b)}
            onClick={() => router.push(`${basePath}/${hotspot.roomId}`)}
            title={room.name}
          >
            <span className="mb-1 rounded bg-background/80 px-1 text-xs">{room.name}</span>
          </button>
        );
      })}
    </div>
  );
}
