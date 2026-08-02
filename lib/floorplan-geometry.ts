export interface Point {
  x: number;
  y: number;
}

/** CSS position/size (in %) for a rect hotspot defined by two opposite corner points. */
export function rectStyle(a: Point, b: Point) {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const width = Math.abs(a.x - b.x);
  const height = Math.abs(a.y - b.y);
  return {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    height: `${height}%`,
  };
}
