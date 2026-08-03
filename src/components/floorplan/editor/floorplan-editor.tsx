"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import {
  clamp01,
  movePoints,
  polygonCentroid,
  rectToPoints,
  toSvgPoints,
  type NormPoint,
} from "@/lib/floorplan-geometry";
import { saveRaumFormen } from "@/app/(app)/admin/etagen/[id]/plan/plan-actions";
import { EditorToolbar, type EditorMode } from "./editor-toolbar";
import { RoomLinkPanel } from "./room-link-panel";

export type EditorRaum = { id: string; name: string };
export type EditorShapeInput = { raumId: string; kind: "RECHTECK" | "POLYGON"; points: NormPoint[] };

type EditorShape = {
  key: string;
  raumId: string | null;
  kind: "RECHTECK" | "POLYGON";
  points: NormPoint[];
};

const CLOSE_THRESHOLD_PX = 14; // Screen-Pixel: Klick auf Startpunkt schließt Polygon
const MIN_RECT_NORM = 0.005; // Mindestkantenlänge eines Rechtecks (normalisiert)

type DragState =
  | { type: "rect"; start: NormPoint }
  | { type: "move"; startPointer: NormPoint; original: NormPoint[]; shapeKey: string; moved: boolean }
  | { type: "vertex"; shapeKey: string; index: number };

export function FloorplanEditor({
  etageId,
  image,
  raeume,
  initialShapes,
}: {
  etageId: string;
  image: { url: string; width: number; height: number };
  raeume: EditorRaum[];
  initialShapes: EditorShapeInput[];
}) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [mode, setMode] = useState<EditorMode>(initialShapes.length === 0 ? "rect" : "edit");
  const [shapes, setShapes] = useState<EditorShape[]>(() =>
    initialShapes.map((s, i) => ({ key: `init-${i}`, ...s }))
  );
  const nextKey = useRef(initialShapes.length);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draftRect, setDraftRect] = useState<{ a: NormPoint; b: NormPoint } | null>(null);
  const [draftPoly, setDraftPoly] = useState<NormPoint[]>([]);
  const [cursor, setCursor] = useState<NormPoint | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pxPerImg, setPxPerImg] = useState(0.2); // Screen-Px pro Bild-Px (für Handle-Größen)
  const [isSaving, startSaving] = useTransition();

  const { width, height } = image;
  const selected = shapes.find((s) => s.key === selectedKey) ?? null;

  // ---------- Koordinaten ----------

  const toNorm = useCallback(
    (clientX: number, clientY: number): NormPoint | null => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return null;
      const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return { x: clamp01(p.x / width), y: clamp01(p.y / height) };
    },
    [width, height]
  );

  /** Abstand (Screen-Px) zwischen Pointer und normalisiertem Punkt. */
  const screenDist = useCallback(
    (clientX: number, clientY: number, p: NormPoint): number => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return Infinity;
      const s = new DOMPoint(p.x * width, p.y * height).matrixTransform(ctm);
      return Math.hypot(s.x - clientX, s.y - clientY);
    },
    [width, height]
  );

  const updatePxRatio = useCallback(() => {
    const ctm = svgRef.current?.getScreenCTM();
    if (ctm) setPxPerImg(ctm.a);
  }, []);

  useEffect(() => {
    updatePxRatio();
    window.addEventListener("resize", updatePxRatio);
    return () => window.removeEventListener("resize", updatePxRatio);
  }, [updatePxRatio]);

  // ---------- Mutationen ----------

  const addShape = (shape: Omit<EditorShape, "key">) => {
    const key = `s-${nextKey.current++}`;
    setShapes((prev) => [...prev, { key, ...shape }]);
    setSelectedKey(key);
    setDirty(true);
    setMode("edit");
  };

  const updateShape = (key: string, patch: Partial<EditorShape>) => {
    setShapes((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const deleteShape = useCallback(
    (key: string) => {
      setShapes((prev) => prev.filter((s) => s.key !== key));
      if (selectedKey === key) setSelectedKey(null);
      setDirty(true);
    },
    [selectedKey]
  );

  const cancelDrafts = useCallback(() => {
    setDraftRect(null);
    setDraftPoly([]);
    setCursor(null);
    dragRef.current = null;
  }, []);

  const closePolygon = useCallback(() => {
    if (draftPoly.length >= 3) {
      addShape({ raumId: null, kind: "POLYGON", points: draftPoly });
    }
    setDraftPoly([]);
    setCursor(null);
     
  }, [draftPoly]);

  // ---------- Globale Drag-/Tastatur-Handler ----------

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const p = toNorm(e.clientX, e.clientY);
      if (!p) return;

      if (drag.type === "rect") {
        setDraftRect({ a: drag.start, b: p });
      } else if (drag.type === "move") {
        const dx = p.x - drag.startPointer.x;
        const dy = p.y - drag.startPointer.y;
        if (Math.abs(dx) + Math.abs(dy) > 0.001) drag.moved = true;
        setShapes((prev) =>
          prev.map((s) =>
            s.key === drag.shapeKey ? { ...s, points: movePoints(drag.original, dx, dy) } : s
          )
        );
        if (drag.moved) setDirty(true);
      } else if (drag.type === "vertex") {
        setShapes((prev) =>
          prev.map((s) =>
            s.key === drag.shapeKey
              ? { ...s, points: s.points.map((pt, i) => (i === drag.index ? p : pt)) }
              : s
          )
        );
        setDirty(true);
      }
    };

    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;

      if (drag.type === "rect") {
        const p = toNorm(e.clientX, e.clientY);
        setDraftRect(null);
        if (p) {
          const pts = rectToPoints(drag.start, p);
          const w = pts[1].x - pts[0].x;
          const h = pts[3].y - pts[0].y;
          if (w > MIN_RECT_NORM && h > MIN_RECT_NORM) {
            addShape({ raumId: null, kind: "RECHTECK", points: pts });
          }
        }
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
     
  }, [toNorm]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (e.key === "Escape") {
        cancelDrafts();
        setSelectedKey(null);
      } else if (e.key === "Enter" && draftPoly.length >= 3) {
        e.preventDefault();
        closePolygon();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedKey) {
        e.preventDefault();
        deleteShape(selectedKey);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelDrafts, closePolygon, deleteShape, draftPoly.length, selectedKey]);

  // Warnung bei ungespeicherten Änderungen
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // ---------- SVG-Events ----------

  const onSvgPointerDown = (e: React.PointerEvent) => {
    if (mode !== "rect" || e.button !== 0) return;
    const p = toNorm(e.clientX, e.clientY);
    if (!p) return;
    dragRef.current = { type: "rect", start: p };
    setDraftRect({ a: p, b: p });
  };

  const onSvgClick = (e: React.MouseEvent) => {
    if (mode !== "polygon") return;
    const p = toNorm(e.clientX, e.clientY);
    if (!p) return;
    if (draftPoly.length >= 3 && screenDist(e.clientX, e.clientY, draftPoly[0]) < CLOSE_THRESHOLD_PX) {
      closePolygon();
      return;
    }
    setDraftPoly((prev) => [...prev, p]);
  };

  const onSvgPointerMove = (e: React.PointerEvent) => {
    if (mode === "polygon" && draftPoly.length > 0) {
      setCursor(toNorm(e.clientX, e.clientY));
    }
  };

  const onShapePointerDown = (e: React.PointerEvent, shape: EditorShape) => {
    if (mode !== "edit" || e.button !== 0) return;
    e.stopPropagation();
    setSelectedKey(shape.key);
    const p = toNorm(e.clientX, e.clientY);
    if (!p) return;
    dragRef.current = {
      type: "move",
      startPointer: p,
      original: shape.points,
      shapeKey: shape.key,
      moved: false,
    };
  };

  const onVertexPointerDown = (e: React.PointerEvent, shapeKey: string, index: number) => {
    if (mode !== "edit" || e.button !== 0) return;
    e.stopPropagation();
    dragRef.current = { type: "vertex", shapeKey, index };
  };

  // ---------- Speichern ----------

  const save = () => {
    const ohneRaum = shapes.filter((s) => !s.raumId).length;
    if (ohneRaum > 0) {
      toast.error(
        `${ohneRaum} Form${ohneRaum === 1 ? " ist" : "en sind"} keinem Raum zugeordnet — bitte zuerst verknüpfen oder löschen.`
      );
      return;
    }
    startSaving(async () => {
      const result = await saveRaumFormen(
        etageId,
        shapes.map((s) => ({ raumId: s.raumId!, kind: s.kind, points: s.points }))
      );
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Raumformen gespeichert");
      setDirty(false);
      router.refresh();
    });
  };

  // ---------- Rendering ----------

  const handleR = 7 / Math.max(pxPerImg, 0.01); // Vertex-Handle-Radius in Bild-Px
  const labelSize = Math.max(16, width / 90);
  const raumName = (raumId: string | null) => raeume.find((r) => r.id === raumId)?.name;
  const usedRaumIds = new Set(shapes.filter((s) => s.raumId && s.key !== selectedKey).map((s) => s.raumId!));

  return (
    <div className="space-y-3">
      <EditorToolbar mode={mode} onModeChange={(m) => { cancelDrafts(); setMode(m); }} onSave={save} dirty={dirty} isSaving={isSaving} />

      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="overflow-hidden rounded-lg border bg-muted/30" style={{ height: "70vh" }}>
          <TransformWrapper
            minScale={0.5}
            maxScale={12}
            centerOnInit
            doubleClick={{ disabled: true }}
            panning={{ disabled: mode !== "pan" }}
            onTransform={updatePxRatio}
            onInit={updatePxRatio}
          >
            <TransformComponent
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentStyle={{ width: "100%", height: "100%" }}
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
                width="100%"
                height="100%"
                onPointerDown={onSvgPointerDown}
                onPointerMove={onSvgPointerMove}
                onClick={onSvgClick}
                style={{
                  cursor: mode === "rect" || mode === "polygon" ? "crosshair" : mode === "pan" ? "grab" : "default",
                  touchAction: "none",
                }}
              >
                { }
                <image
                  href={image.url}
                  width={width}
                  height={height}
                  onClick={() => {
                    if (mode === "edit" && !dragRef.current) setSelectedKey(null);
                  }}
                />

                {shapes.map((s) => {
                  const isSelected = s.key === selectedKey;
                  const centroid = polygonCentroid(s.points);
                  const name = raumName(s.raumId);
                  return (
                    <g key={s.key}>
                      <polygon
                        points={toSvgPoints(s.points, width, height)}
                        fill={s.raumId ? "rgba(37, 99, 235, 0.18)" : "rgba(245, 158, 11, 0.25)"}
                        stroke={isSelected ? "#2563eb" : s.raumId ? "rgba(37, 99, 235, 0.7)" : "#d97706"}
                        strokeWidth={isSelected ? 2.5 : 1.5}
                        vectorEffect="non-scaling-stroke"
                        style={{
                          cursor: mode === "edit" ? "move" : undefined,
                          pointerEvents: mode === "pan" || mode === "rect" || mode === "polygon" ? "none" : "auto",
                        }}
                        onPointerDown={(e) => onShapePointerDown(e, s)}
                      />
                      <text
                        x={centroid.x * width}
                        y={centroid.y * height}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={labelSize}
                        fill="#1e3a8a"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {name ?? "— kein Raum —"}
                      </text>
                      {isSelected && mode === "edit"
                        ? s.points.map((p, i) => (
                            <circle
                              key={i}
                              cx={p.x * width}
                              cy={p.y * height}
                              r={handleR}
                              fill="#ffffff"
                              stroke="#2563eb"
                              strokeWidth={2}
                              vectorEffect="non-scaling-stroke"
                              style={{ cursor: "grab" }}
                              onPointerDown={(e) => onVertexPointerDown(e, s.key, i)}
                            />
                          ))
                        : null}
                    </g>
                  );
                })}

                {/* Rechteck-Entwurf */}
                {draftRect ? (
                  <polygon
                    points={toSvgPoints(rectToPoints(draftRect.a, draftRect.b), width, height)}
                    fill="rgba(37, 99, 235, 0.12)"
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                ) : null}

                {/* Polygon-Entwurf */}
                {draftPoly.length > 0 ? (
                  <g pointerEvents="none">
                    <polyline
                      points={toSvgPoints(cursor ? [...draftPoly, cursor] : draftPoly, width, height)}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth={1.5}
                      strokeDasharray="6 4"
                      vectorEffect="non-scaling-stroke"
                    />
                    {draftPoly.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x * width}
                        cy={p.y * height}
                        r={i === 0 ? handleR * 1.2 : handleR * 0.8}
                        fill={i === 0 ? "#2563eb" : "#ffffff"}
                        stroke="#2563eb"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}
                  </g>
                ) : null}
              </svg>
            </TransformComponent>
          </TransformWrapper>
        </div>

        <div className="space-y-3">
          {selected ? (
            <RoomLinkPanel
              raeume={raeume}
              usedRaumIds={usedRaumIds}
              selectedRaumId={selected.raumId}
              onRaumChange={(raumId) => updateShape(selected.key, { raumId })}
              onDelete={() => deleteShape(selected.key)}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {shapes.length === 0
                ? "Noch keine Raumformen. Zeichne mit dem Rechteck- oder Polygon-Werkzeug Formen über die Räume."
                : "Wähle im Auswählen-Modus eine Form, um sie zu verschieben, umzuformen oder mit einem Raum zu verknüpfen."}
            </p>
          )}
          <div className="text-xs text-muted-foreground lg:hidden">
            Hinweis: Der Editor ist für Desktop mit Maus optimiert.
          </div>
        </div>
      </div>
    </div>
  );
}
