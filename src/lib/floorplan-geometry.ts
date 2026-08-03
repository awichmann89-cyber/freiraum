/** Normalisierte Koordinate relativ zum Plan-Bild (0..1 in beiden Achsen). */
export type NormPoint = { x: number; y: number };

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

export function clampPoint(p: NormPoint): NormPoint {
  return { x: clamp01(p.x), y: clamp01(p.y) };
}

/** Zwei Eckpunkte -> Rechteck als 4-Punkte-Polygon (im Uhrzeigersinn). */
export function rectToPoints(a: NormPoint, b: NormPoint): NormPoint[] {
  const x1 = Math.min(a.x, b.x);
  const x2 = Math.max(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const y2 = Math.max(a.y, b.y);
  return [
    { x: x1, y: y1 },
    { x: x2, y: y1 },
    { x: x2, y: y2 },
    { x: x1, y: y2 },
  ];
}

/** Alle Punkte verschieben, so geclampt, dass die Form komplett im Bild bleibt. */
export function movePoints(points: NormPoint[], dx: number, dy: number): NormPoint[] {
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const cdx = Math.min(Math.max(dx, -minX), 1 - maxX);
  const cdy = Math.min(Math.max(dy, -minY), 1 - maxY);
  return points.map((p) => ({ x: p.x + cdx, y: p.y + cdy }));
}

/** Flächenschwerpunkt (für Raum-Label); Fallback: Mittelwert der Punkte. */
export function polygonCentroid(points: NormPoint[]): NormPoint {
  if (points.length < 3) {
    const sx = points.reduce((s, p) => s + p.x, 0);
    const sy = points.reduce((s, p) => s + p.y, 0);
    return { x: sx / Math.max(points.length, 1), y: sy / Math.max(points.length, 1) };
  }
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(area) < 1e-9) {
    // degeneriert (kollinear) -> Mittelwert
    return {
      x: points.reduce((s, p) => s + p.x, 0) / points.length,
      y: points.reduce((s, p) => s + p.y, 0) / points.length,
    };
  }
  area /= 2;
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

/** Fläche eines normalisierten Polygons (in Bildanteilen, 0..1). */
export function polygonArea(points: NormPoint[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

/** points-JSON aus der DB defensiv parsen. */
export function parsePoints(json: unknown): NormPoint[] {
  if (!Array.isArray(json)) return [];
  const result: NormPoint[] = [];
  for (const item of json) {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as NormPoint).x === "number" &&
      typeof (item as NormPoint).y === "number"
    ) {
      result.push(clampPoint({ x: (item as NormPoint).x, y: (item as NormPoint).y }));
    }
  }
  return result;
}

/** Normalisierte Punkte -> SVG-"points"-Attribut in Bildpixeln. */
export function toSvgPoints(points: NormPoint[], width: number, height: number): string {
  return points.map((p) => `${(p.x * width).toFixed(1)},${(p.y * height).toFixed(1)}`).join(" ");
}
