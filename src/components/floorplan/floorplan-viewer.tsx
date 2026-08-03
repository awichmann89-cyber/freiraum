"use client";

import { useRef, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { polygonCentroid, toSvgPoints, type NormPoint } from "@/lib/floorplan-geometry";
import { RoomDetailSheet } from "./room-detail-sheet";

export type ViewerShape = {
  raumId: string;
  raumName: string;
  points: NormPoint[];
  busyNow: boolean;
  sizeSqm: string | null;
  capacity: number | null;
  heuteBuchungen: { startMin: number; endMin: number; titel: string; subtitle: string | null }[];
};

const TAP_THRESHOLD_PX = 8; // Bewegung darüber = Pan, kein Tap

export function FloorplanViewer({
  image,
  shapes,
  dateISO,
}: {
  image: { url: string; width: number; height: number };
  shapes: ViewerShape[];
  dateISO: string;
}) {
  const [selected, setSelected] = useState<ViewerShape | null>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);

  const { width, height } = image;
  const labelSize = Math.max(16, width / 90);

  return (
    <>
      <div
        className="overflow-hidden rounded-lg border bg-muted/30"
        style={{ height: "calc(100dvh - 220px)", minHeight: 320 }}
      >
        <TransformWrapper minScale={0.5} maxScale={12} centerOnInit doubleClick={{ mode: "zoomIn" }}>
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: "100%", height: "100%" }}
          >
            <svg
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="xMidYMid meet"
              width="100%"
              height="100%"
              onPointerDown={(e) => {
                downPos.current = { x: e.clientX, y: e.clientY };
              }}
            >
              { }
              <image href={image.url} width={width} height={height} />
              {shapes.map((s) => {
                const centroid = polygonCentroid(s.points);
                return (
                  <g key={s.raumId}>
                    <polygon
                      points={toSvgPoints(s.points, width, height)}
                      fill={s.busyNow ? "rgba(220, 38, 38, 0.22)" : "rgba(22, 163, 74, 0.18)"}
                      stroke={s.busyNow ? "rgba(220, 38, 38, 0.8)" : "rgba(22, 163, 74, 0.8)"}
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                      style={{ cursor: "pointer" }}
                      onClick={(e) => {
                        const d = downPos.current;
                        if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > TAP_THRESHOLD_PX) {
                          return; // war ein Pan, kein Tap
                        }
                        setSelected(s);
                      }}
                    />
                    <text
                      x={centroid.x * width}
                      y={centroid.y * height}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={labelSize}
                      fill="#111827"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {s.raumName}
                    </text>
                  </g>
                );
              })}
            </svg>
          </TransformComponent>
        </TransformWrapper>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm border border-emerald-600 bg-emerald-600/20" />
          gerade frei
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded-sm border border-red-600 bg-red-600/20" />
          gerade belegt
        </span>
        <span className="hidden sm:inline">Tippen für Details · Kneifen/Scrollen zum Zoomen</span>
      </div>

      <RoomDetailSheet shape={selected} dateISO={dateISO} onClose={() => setSelected(null)} />
    </>
  );
}
