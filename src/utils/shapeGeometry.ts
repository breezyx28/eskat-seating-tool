import type { Section, Point, EdgeCurve } from '@/types';

/**
 * Returns true when `pt` (section-local coordinates, relative to section.bounds
 * origin) is inside the section's true geometric shape — not just the bounding
 * rectangle. Used by seat generation to clip the grid to the exact visible
 * silhouette (circle, ellipse, polygon, arc, bezier-curved polygon).
 */
export function pointInSection(section: Section, pt: Point): boolean {
  const { width, height } = section.bounds;
  switch (section.type) {
    case 'rectangle':
    case 'stage':
      return pt.x >= 0 && pt.y >= 0 && pt.x <= width && pt.y <= height;

    case 'circle':
    case 'ellipse': {
      const rx = width / 2;
      const ry = height / 2;
      if (rx <= 0 || ry <= 0) return false;
      const dx = (pt.x - rx) / rx;
      const dy = (pt.y - ry) / ry;
      return dx * dx + dy * dy <= 1;
    }

    case 'polygon': {
      const pts = section.points;
      if (!pts || pts.length < 3) return false;
      const sampled = samplePolygonOutline(pts, section.edgeCurves);
      return pointInPolygon(pt, sampled);
    }

    case 'arc': {
      const arc = section.arc;
      if (!arc) return false;
      // Arc is drawn around the centre of the section bounds.
      const cx = width / 2;
      const cy = height / 2;
      const dx = pt.x - cx;
      const dy = pt.y - cy;
      const r = Math.hypot(dx, dy);
      if (r < arc.innerRadius || r > arc.outerRadius) return false;
      // Angle in [-PI, PI]; normalise to the arc's direction.
      const ang = Math.atan2(dy, dx);
      return angleInRange(ang, arc.startAngle, arc.endAngle);
    }

    default:
      return true;
  }
}

/**
 * Angle `ang` ∈ range `[start, end]` when traversed counter-clockwise, with all
 * angles normalised via 2π wrapping. Works whether `end` is numerically greater
 * than `start` or the range crosses the -π/π boundary.
 */
function angleInRange(ang: number, start: number, end: number): boolean {
  const TAU = Math.PI * 2;
  const norm = (a: number) => ((a % TAU) + TAU) % TAU;
  const a = norm(ang);
  const s = norm(start);
  let sweep = end - start;
  if (sweep <= 0) sweep += TAU;
  if (sweep >= TAU) return true;
  const delta = norm(a - s);
  return delta <= sweep;
}

/**
 * Samples polygon edges — including cubic-bezier `edgeCurves` — into a dense
 * polyline suitable for `pointInPolygon`. Straight edges contribute only their
 * endpoints; curved edges contribute `segments` intermediate samples.
 */
export function samplePolygonOutline(
  points: Point[],
  edgeCurves?: Record<number, EdgeCurve>,
  segments = 14
): Point[] {
  if (!points.length) return [];
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const curve = edgeCurves?.[i];
    out.push(a);
    if (curve) {
      for (let s = 1; s < segments; s++) {
        const t = s / segments;
        const mt = 1 - t;
        out.push({
          x:
            mt * mt * mt * a.x +
            3 * mt * mt * t * curve.cp1.x +
            3 * mt * t * t * curve.cp2.x +
            t * t * t * b.x,
          y:
            mt * mt * mt * a.y +
            3 * mt * mt * t * curve.cp1.y +
            3 * mt * t * t * curve.cp2.y +
            t * t * t * b.y,
        });
      }
    }
  }
  return out;
}

/** Classic ray-cast point-in-polygon. */
export function pointInPolygon(pt: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Returns true when the axis-aligned seat rectangle `rect` (section-local
 * coords, origin at the section top-left) is fully contained in the section's
 * shape. We sample the four corners and the centre — cheap and sufficient for
 * typical seat sizes.
 */
export function rectInsideSection(section: Section, rect: {
  x: number; y: number; width: number; height: number;
}): boolean {
  const { x, y, width, height } = rect;
  const probes: Point[] = [
    { x: x + width / 2, y: y + height / 2 },
    { x, y },
    { x: x + width, y },
    { x, y: y + height },
    { x: x + width, y: y + height },
  ];
  for (const p of probes) {
    if (!pointInSection(section, p)) return false;
  }
  return true;
}
