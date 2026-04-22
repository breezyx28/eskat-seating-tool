import type { Point, EdgeCurve } from '@/types';

/**
 * Converts a polygon's vertex list (plus optional per-edge bezier curves)
 * into an SVG path `d` attribute. Each edge index refers to the edge leaving
 * the vertex at that index and going to the next one (wrapping).
 */
export function polygonToPath(
  points: Point[],
  edgeCurves?: Record<number, EdgeCurve>
): string {
  if (!points.length) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const curve = edgeCurves?.[i];
    if (curve) {
      d += ` C ${curve.cp1.x} ${curve.cp1.y} ${curve.cp2.x} ${curve.cp2.y} ${next.x} ${next.y}`;
    } else {
      d += ` L ${next.x} ${next.y}`;
    }
  }
  d += ' Z';
  return d;
}

/**
 * Returns the midpoint of edge `i` (vertex i → vertex i+1 wrapping), possibly
 * curved. Used to position the "bend" handle in the polygon editor.
 */
export function edgeMidpoint(
  points: Point[],
  i: number,
  edgeCurves?: Record<number, EdgeCurve>
): Point {
  const a = points[i];
  const b = points[(i + 1) % points.length];
  const curve = edgeCurves?.[i];
  if (!curve) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  // cubic bezier midpoint at t=0.5
  const t = 0.5;
  const mt = 1 - t;
  return {
    x: mt * mt * mt * a.x + 3 * mt * mt * t * curve.cp1.x + 3 * mt * t * t * curve.cp2.x + t * t * t * b.x,
    y: mt * mt * mt * a.y + 3 * mt * mt * t * curve.cp1.y + 3 * mt * t * t * curve.cp2.y + t * t * t * b.y,
  };
}
