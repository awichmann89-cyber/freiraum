"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Canvas-Unterschriftenfeld: Pointer-Strokes -> PNG-Data-URL. */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Bei Resize geht der Inhalt verloren — akzeptabel, Nutzer unterschreibt neu
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e293b";
      setHasStrokes(false);
      onChange(null);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    drawing.current = true;
    canvasRef.current!.setPointerCapture(e.pointerId);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    // Punkt auch bei bloßem Tippen sichtbar machen
    ctx.lineTo(pos.x + 0.1, pos.y + 0.1);
    ctx.stroke();
    setHasStrokes(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endStroke = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="h-40 w-full cursor-crosshair rounded-md border bg-white dark:bg-zinc-100"
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        aria-label="Unterschriftenfeld"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Mit Finger, Stift oder Maus im Feld unterschreiben.
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={clear} disabled={!hasStrokes}>
          <Eraser className="size-4" /> Löschen
        </Button>
      </div>
    </div>
  );
}
