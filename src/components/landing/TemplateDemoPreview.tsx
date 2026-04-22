import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import {
  ArrowClockwise,
  Plus,
  Minus,
  ArrowsOut,
  SelectionPlus,
} from '@phosphor-icons/react';
import type { Section, Seat, VenueData } from '@/types';
import { arcPath } from '@/components/canvas/ArcRenderer';
import { polygonToPath } from '@/utils/polygonPath';

/* ─── Types ─────────────────────────────────────────────────────── */

type SeatRuntimeState = 'available' | 'reserved' | 'disabled' | 'accessible';

export type DemoSeatShape = 'circle' | 'rounded' | 'square' | 'chair' | 'chair-simple';

/** One labelled keyboard shortcut line rendered inside the hover tooltip. */
interface TooltipShortcut {
  keys: string[];
  label: string;
}

interface Props {
  venue: VenueData;
  selectedSeatIds: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
  onReset: () => void;
  shape: DemoSeatShape;
  rangeMode: boolean;
  onToggleRangeMode: () => void;
}

interface FlatSeat {
  seat: Seat;
  sectionId: string;
  sectionName: string;
  price: number;
  currency: string;
}

interface SeatWorldPos {
  x: number;
  y: number;
  r: number;
  state: SeatRuntimeState;
  clickable: boolean;
}

interface MarqueeState {
  // SVG viewBox coordinates for drawing the rect.
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  shift: boolean;
  moved: boolean;
}

/** Shared reference so memos that return "no ids" don't churn selectors. */
const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/**
 * Inclusive range of seat ids between `anchorId` and `targetId` when they
 * share a `rowLabel` inside the same section, ordered by `seatNumber`.
 * Clickable-only, so reserved/disabled seats are filtered out. Falls back
 * to the two endpoints (if clickable) when the seats don't share a row.
 */
function computeRange(
  anchorId: string,
  targetId: string,
  flatSeatsById: Map<string, { seat: Seat; sectionId: string }>,
  flatSections: Section[]
): Set<string> {
  const a = flatSeatsById.get(anchorId);
  const b = flatSeatsById.get(targetId);
  if (!a || !b) return new Set();
  const sameSection = a.sectionId === b.sectionId;
  const sameRow =
    sameSection && !!a.seat.rowLabel && a.seat.rowLabel === b.seat.rowLabel;

  if (!sameRow) return new Set([anchorId, targetId]);

  const sec = flatSections.find((s) => s.id === a.sectionId);
  if (!sec) return new Set([anchorId, targetId]);

  const rowSeats = sec.seats
    .filter((s) => s.rowLabel === a.seat.rowLabel)
    .sort((p, q) => {
      const pn = Number(p.seatNumber);
      const qn = Number(q.seatNumber);
      if (Number.isFinite(pn) && Number.isFinite(qn)) return pn - qn;
      return String(p.seatNumber).localeCompare(String(q.seatNumber));
    });
  const ai = rowSeats.findIndex((s) => s.id === anchorId);
  const bi = rowSeats.findIndex((s) => s.id === targetId);
  if (ai < 0 || bi < 0) return new Set([anchorId, targetId]);
  const [lo, hi] = ai <= bi ? [ai, bi] : [bi, ai];
  return new Set(rowSeats.slice(lo, hi + 1).map((s) => s.id));
}

/* ─── Tiny deterministic RNG ────────────────────────────────────── */

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Geometry helpers ──────────────────────────────────────────── */

interface P { x: number; y: number; }

function rotatePoint(p: P, cx: number, cy: number, deg: number): P {
  if (!deg) return p;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** The 4 world corners of a section's bounding box after its own rotation. */
function rotatedCorners(section: Section): P[] {
  const { x, y, width, height } = section.bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const deg = section.rotation ?? 0;
  const corners: P[] = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
  return corners.map((p) => rotatePoint(p, cx, cy, deg));
}

/**
 * Build a polygon/bezier path in *absolute* coordinates by baking a
 * translation into every vertex and control point. This avoids a nested
 * `<g transform>` inside a `<clipPath>`, which some renderers apply
 * inconsistently and can cause seats to be clipped out entirely.
 */
function polygonPathAbs(
  points: { x: number; y: number }[],
  edgeCurves: Section['edgeCurves'],
  dx: number,
  dy: number
): string {
  if (!points.length) return '';
  let d = `M ${points[0].x + dx} ${points[0].y + dy}`;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const curve = edgeCurves?.[i];
    if (curve) {
      d += ` C ${curve.cp1.x + dx} ${curve.cp1.y + dy} ${curve.cp2.x + dx} ${curve.cp2.y + dy} ${next.x + dx} ${next.y + dy}`;
    } else {
      d += ` L ${next.x + dx} ${next.y + dy}`;
    }
  }
  d += ' Z';
  return d;
}

/**
 * Geometry-only SVG for a section, always emitted in *absolute* user-space
 * coordinates (no nested transforms). Shared between the visible section
 * shape and the `<clipPath>` that keeps seats inside it.
 */
function sectionClipGeometry(section: Section): React.ReactNode {
  const { bounds } = section;
  if (section.type === 'polygon' && section.points && section.points.length >= 3) {
    const d = polygonPathAbs(section.points, section.edgeCurves, bounds.x, bounds.y);
    return <path d={d} />;
  }
  if (section.type === 'arc' && section.arc) {
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const d = arcPath(
      cx,
      cy,
      section.arc.innerRadius,
      section.arc.outerRadius,
      section.arc.startAngle,
      section.arc.endAngle
    );
    return <path d={d} />;
  }
  if (section.type === 'circle' || section.type === 'ellipse') {
    return (
      <ellipse
        cx={bounds.x + bounds.width / 2}
        cy={bounds.y + bounds.height / 2}
        rx={bounds.width / 2}
        ry={bounds.height / 2}
      />
    );
  }
  const radius = typeof section.cornerRadius === 'number' ? section.cornerRadius : 6;
  return (
    <rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      rx={radius}
      ry={radius}
    />
  );
}

/**
 * End-user-facing, read-only seat picker rendered inside the landing demo
 * window. Handles fit-to-contain via viewBox, seeded "real world" seat states,
 * Figma-style shift-click + drag-marquee multi-select, and space-held pan.
 */
export function TemplateDemoPreview({
  venue,
  selectedSeatIds,
  onSelectionChange,
  onReset,
  shape,
  rangeMode,
  onToggleRangeMode,
}: Props) {
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hover, setHover] = useState<{
    seatId: string;
    x: number;
    y: number;
    label: string;
    shortcuts: TooltipShortcut[] | null;
  } | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  // Range-select anchor — set on the first click while rangeMode is on (or on
  // any single-select click while off, so Shift+Click can still grab a range).
  const [anchorSeatId, setAnchorSeatId] = useState<string | null>(null);

  /* ─── Flatten + index sections and seats ────────────────────── */

  const { flatSections, flatSeatsById } = useMemo(() => {
    const sections: Section[] = [];
    const byId = new Map<string, FlatSeat>();
    const walk = (list: Section[]) => {
      for (const sec of list) {
        sections.push(sec);
        for (const seat of sec.seats) {
          byId.set(seat.id, {
            seat,
            sectionId: sec.id,
            sectionName: sec.name,
            price: sec.price,
            currency: sec.currency,
          });
        }
        if (sec.children?.length) walk(sec.children);
      }
    };
    walk(venue.sections);
    sections.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    return { flatSections: sections, flatSeatsById: byId };
  }, [venue]);

  /* ─── Tight content bbox (fixes clipping + padding on all templates) ─ */

  const contentBBox = useMemo(() => {
    if (flatSections.length === 0) {
      return { x: 0, y: 0, w: venue.venue.width, h: venue.venue.height };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const sec of flatSections) {
      for (const { x, y } of rotatedCorners(sec)) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
    const w = maxX - minX;
    const h = maxY - minY;
    const pad = Math.max(w, h) * 0.04;
    return { x: minX - pad, y: minY - pad, w: w + pad * 2, h: h + pad * 2 };
  }, [flatSections, venue.venue.width, venue.venue.height]);

  /* ─── Seeded randomized seat states (demo-only realism) ─────── */

  const seatStates = useMemo(() => {
    const rand = mulberry32(hashString(venue.venue.name || 'venue'));
    const out = new Map<string, SeatRuntimeState>();
    for (const [id] of flatSeatsById) {
      const r = rand();
      let state: SeatRuntimeState;
      if (r < 0.05) state = 'disabled';
      else if (r < 0.1) state = 'accessible';
      else if (r < 0.28) state = 'reserved';
      else state = 'available';
      out.set(id, state);
    }
    return out;
  }, [venue.venue.name, flatSeatsById]);

  /* ─── Precompute seat world positions for marquee hit-testing ─ */

  const seatWorldPositions = useMemo(() => {
    const out = new Map<string, SeatWorldPos>();
    for (const sec of flatSections) {
      const cx = sec.bounds.x + sec.bounds.width / 2;
      const cy = sec.bounds.y + sec.bounds.height / 2;
      const deg = sec.rotation ?? 0;
      for (const seat of sec.seats) {
        const sx = sec.bounds.x + seat.bounds.x + seat.bounds.width / 2;
        const sy = sec.bounds.y + seat.bounds.y + seat.bounds.height / 2;
        const rotated = deg ? rotatePoint({ x: sx, y: sy }, cx, cy, deg) : { x: sx, y: sy };
        const state = seatStates.get(seat.id) ?? 'available';
        const clickable = state === 'available' || state === 'accessible';
        out.set(seat.id, {
          x: rotated.x,
          y: rotated.y,
          r: Math.min(seat.bounds.width, seat.bounds.height) / 2,
          state,
          clickable,
        });
      }
    }
    return out;
  }, [flatSections, seatStates]);

  /* ─── Row-mate + range-preview derivations ─────────────────── */

  // All seats in the same section with the same rowLabel as the hovered seat.
  // Used purely for the soft outline "row preview" when a user hovers.
  const hoveredRowIds = useMemo(() => {
    if (!hover) return EMPTY_SET;
    const entry = flatSeatsById.get(hover.seatId);
    if (!entry || !entry.seat.rowLabel) return new Set<string>([hover.seatId]);
    const sec = flatSections.find((s) => s.id === entry.sectionId);
    if (!sec) return new Set<string>([hover.seatId]);
    const ids = new Set<string>();
    for (const s of sec.seats) {
      if (s.rowLabel === entry.seat.rowLabel) ids.add(s.id);
    }
    return ids;
  }, [hover, flatSeatsById, flatSections]);

  // Contiguous seat-number range between anchor and hovered seat within the
  // same row + section. Falls back to just the two endpoints when the seats
  // don't share a row.
  const rangePreviewIds = useMemo(() => {
    if (!anchorSeatId || !hover || hover.seatId === anchorSeatId) return EMPTY_SET;
    return computeRange(anchorSeatId, hover.seatId, flatSeatsById, flatSections);
  }, [anchorSeatId, hover, flatSeatsById, flatSections]);

  /* ─── Container sizing (for TransformComponent content) ────── */

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSize({ w: rect.width, h: rect.height });
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wrapperKey = useMemo(
    () => `${venue.venue.name}-${Math.round(size.w / 40)}-${Math.round(size.h / 40)}`,
    [venue.venue.name, size.w, size.h]
  );

  useEffect(() => {
    const ref = transformRef.current;
    if (!ref) return;
    if (ref.state.scale < 1) ref.resetTransform(0);
  }, [size.w, size.h]);

  const zoomIn = () => transformRef.current?.zoomIn(0.25);
  const zoomOut = () => transformRef.current?.zoomOut(0.25);
  const fit = () => transformRef.current?.resetTransform(200);

  /* ─── Space-to-pan tracking ─────────────────────────────────── */

  const spaceDownRef = useRef(false);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        spaceDownRef.current = true;
        if (containerRef.current) {
          containerRef.current.style.cursor = 'grab';
        }
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        if (containerRef.current) containerRef.current.style.cursor = '';
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAnchorSeatId(null);
    };
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Exiting range-mode from the toolbar also drops the anchor to avoid
  // re-entering the mode with a stale preview state.
  useEffect(() => {
    if (!rangeMode) return;
    // When entering range mode keep the current anchor (if any) so the user
    // can click-commit immediately after toggling on.
  }, [rangeMode]);

  /* ─── Pointer → SVG viewBox coords ──────────────────────────── */

  const clientToSvg = useCallback((clientX: number, clientY: number): P | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }, []);

  /* ─── Drag lifecycle (marquee OR space-pan) ─────────────────── */

  const dragRef = useRef<{
    mode: 'marquee' | 'pan';
    shift: boolean;
    startClient: { x: number; y: number };
    startSvg: P;
    panStart?: { x: number; y: number; scale: number };
    moved: boolean;
  } | null>(null);

  /**
   * Gate for seat clicks — set to `true` for one click cycle after a drag,
   * so the trailing synthetic click event doesn't pollute the marquee's
   * selection result.
   */
  const suppressClickRef = useRef(false);

  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (e.button !== 0) return;
      const targetSeat = (e.target as SVGElement).closest('[data-seat-id]');
      if (targetSeat) return;

      const svgPt = clientToSvg(e.clientX, e.clientY);
      if (!svgPt) return;

      if (spaceDownRef.current) {
        const ref = transformRef.current;
        if (!ref) return;
        dragRef.current = {
          mode: 'pan',
          shift: e.shiftKey,
          startClient: { x: e.clientX, y: e.clientY },
          startSvg: svgPt,
          panStart: {
            x: ref.state.positionX,
            y: ref.state.positionY,
            scale: ref.state.scale,
          },
          moved: false,
        };
        if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      } else {
        dragRef.current = {
          mode: 'marquee',
          shift: e.shiftKey,
          startClient: { x: e.clientX, y: e.clientY },
          startSvg: svgPt,
          moved: false,
        };
      }

      const onMove = (me: MouseEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = me.clientX - d.startClient.x;
        const dy = me.clientY - d.startClient.y;
        if (!d.moved && Math.hypot(dx, dy) > 3) d.moved = true;

        if (d.mode === 'pan' && d.panStart) {
          const ref = transformRef.current;
          if (!ref) return;
          ref.setTransform(
            d.panStart.x + dx,
            d.panStart.y + dy,
            d.panStart.scale,
            0
          );
          return;
        }

        // Marquee — translate current client point into SVG coords so the
        // rect stays aligned to the venue as we zoom/pan.
        const p = clientToSvg(me.clientX, me.clientY);
        if (!p) return;
        setMarquee({
          x0: d.startSvg.x,
          y0: d.startSvg.y,
          x1: p.x,
          y1: p.y,
          shift: d.shift,
          moved: d.moved,
        });
      };

      const onUp = (ue: MouseEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        const d = dragRef.current;
        dragRef.current = null;
        if (!d) return;
        if (containerRef.current) {
          containerRef.current.style.cursor = spaceDownRef.current ? 'grab' : '';
        }

        if (d.mode === 'pan') return;

        if (!d.moved) {
          // It was a true click on empty space — clear selection unless shift.
          if (!d.shift) {
            onSelectionChange(new Set());
            setAnchorSeatId(null);
          }
          setMarquee(null);
          return;
        }

        // Marquee hit-test.
        const endSvg = clientToSvg(ue.clientX, ue.clientY) ?? d.startSvg;
        const x0 = Math.min(d.startSvg.x, endSvg.x);
        const x1 = Math.max(d.startSvg.x, endSvg.x);
        const y0 = Math.min(d.startSvg.y, endSvg.y);
        const y1 = Math.max(d.startSvg.y, endSvg.y);

        const next = d.shift ? new Set(selectedSeatIds) : new Set<string>();
        for (const [id, pos] of seatWorldPositions) {
          if (!pos.clickable) continue;
          if (pos.x >= x0 && pos.x <= x1 && pos.y >= y0 && pos.y <= y1) {
            next.add(id);
          }
        }
        onSelectionChange(next);
        setAnchorSeatId(null);
        suppressClickRef.current = true;
        setMarquee(null);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [clientToSvg, onSelectionChange, seatWorldPositions, selectedSeatIds]
  );

  /* ─── Seat click ────────────────────────────────────────────── */

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      const target = (e.target as SVGElement).closest('[data-seat-id]') as
        | SVGElement
        | null;
      if (!target) return;
      const seatId = target.getAttribute('data-seat-id');
      if (!seatId) return;
      const pos = seatWorldPositions.get(seatId);
      if (!pos || !pos.clickable) return;

      // Alt+Click — select every seat in the same row + section.
      if (e.altKey) {
        const entry = flatSeatsById.get(seatId);
        if (!entry) return;
        if (!entry.seat.rowLabel) {
          onSelectionChange(new Set([seatId]));
          setAnchorSeatId(seatId);
          return;
        }
        const sec = flatSections.find((s) => s.id === entry.sectionId);
        if (!sec) return;
        const rowIds = new Set<string>();
        for (const s of sec.seats) {
          if (s.rowLabel !== entry.seat.rowLabel) continue;
          const sp = seatWorldPositions.get(s.id);
          if (sp?.clickable) rowIds.add(s.id);
        }
        onSelectionChange(rowIds);
        setAnchorSeatId(seatId);
        return;
      }

      // Ctrl/Cmd+Click — additive toggle.
      if (e.ctrlKey || e.metaKey) {
        const next = new Set(selectedSeatIds);
        if (next.has(seatId)) next.delete(seatId);
        else next.add(seatId);
        onSelectionChange(next);
        setAnchorSeatId(seatId);
        return;
      }

      // Shift+Click OR range-mode with an anchor set — commit an inclusive
      // row-range between the anchor and the clicked seat.
      if ((e.shiftKey || rangeMode) && anchorSeatId && anchorSeatId !== seatId) {
        const range = computeRange(anchorSeatId, seatId, flatSeatsById, flatSections);
        // Filter out non-clickable stragglers (shouldn't happen for same-row
        // paths but the 2-endpoint fallback might include reserved seats).
        const clickableRange = new Set<string>();
        for (const id of range) {
          if (seatWorldPositions.get(id)?.clickable) clickableRange.add(id);
        }
        if (e.shiftKey) {
          // Additive — union with existing selection.
          const next = new Set(selectedSeatIds);
          for (const id of clickableRange) next.add(id);
          onSelectionChange(next);
        } else {
          onSelectionChange(clickableRange);
        }
        setAnchorSeatId(seatId);
        return;
      }

      // Plain click — single select (toggle off if this was the only one).
      const wasOnlySelected =
        selectedSeatIds.has(seatId) && selectedSeatIds.size === 1;
      if (wasOnlySelected) {
        onSelectionChange(new Set());
        setAnchorSeatId(null);
      } else {
        onSelectionChange(new Set([seatId]));
        setAnchorSeatId(seatId);
      }
    },
    [
      anchorSeatId,
      flatSeatsById,
      flatSections,
      onSelectionChange,
      rangeMode,
      seatWorldPositions,
      selectedSeatIds,
    ]
  );

  /* ─── Hover tooltip ─────────────────────────────────────────── */

  const handleSvgMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (dragRef.current) return;
      const target = (e.target as SVGElement).closest('[data-seat-id]') as
        | SVGElement
        | null;
      if (!target) {
        if (hover) setHover(null);
        return;
      }
      const seatId = target.getAttribute('data-seat-id');
      if (!seatId) return;
      const entry = flatSeatsById.get(seatId);
      if (!entry) return;
      const runtime = seatStates.get(seatId) ?? 'available';
      const rowPart = entry.seat.rowLabel ? `${entry.seat.rowLabel} · ` : '';
      const stateStr =
        runtime === 'reserved'
          ? ' · Reserved'
          : runtime === 'disabled'
            ? ' · Unavailable'
            : runtime === 'accessible'
              ? ' · Accessible'
              : '';
      const priceStr =
        entry.price > 0 && runtime !== 'disabled'
          ? ` — ${entry.currency}${entry.price.toLocaleString()}`
          : '';
      const clickable = runtime === 'available' || runtime === 'accessible';
      let shortcuts: TooltipShortcut[] | null = null;
      if (clickable) {
        if (rangeMode && anchorSeatId) {
          shortcuts = [
            { keys: ['Click'], label: 'finish range' },
            { keys: ['Esc'], label: 'cancel' },
          ];
        } else {
          shortcuts = [
            { keys: ['Alt', 'Click'], label: 'select whole row' },
            { keys: ['Shift', 'Click'], label: 'select range' },
            { keys: ['Ctrl', 'Click'], label: 'add to selection' },
          ];
        }
      }
      setHover({
        seatId,
        x: e.clientX,
        y: e.clientY,
        label: `${rowPart}Seat ${entry.seat.seatNumber}${priceStr}${stateStr}`,
        shortcuts,
      });
    },
    [flatSeatsById, seatStates, hover, rangeMode, anchorSeatId]
  );

  const handleSvgLeave = useCallback(() => setHover(null), []);

  /* ─── Marquee rect in viewBox coords ─────────────────────────── */

  const marqueeRect = useMemo(() => {
    if (!marquee || !marquee.moved) return null;
    const x = Math.min(marquee.x0, marquee.x1);
    const y = Math.min(marquee.y0, marquee.y1);
    const w = Math.abs(marquee.x1 - marquee.x0);
    const h = Math.abs(marquee.y1 - marquee.y0);
    return { x, y, w, h };
  }, [marquee]);

  /* ─── Render ───────────────────────────────────────────────── */

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{
        background: 'var(--bg-canvas)',
        overflow: 'hidden',
      }}
    >
      {size.w > 0 && size.h > 0 ? (
        <TransformWrapper
          key={wrapperKey}
          ref={(r) => {
            transformRef.current = r;
          }}
          initialScale={1}
          minScale={1}
          maxScale={6}
          centerOnInit
          limitToBounds
          wheel={{ disabled: true }}
          pinch={{ disabled: true }}
          doubleClick={{ disabled: true }}
          panning={{
            velocityDisabled: true,
            allowLeftClickPan: false,
            allowMiddleClickPan: true,
            allowRightClickPan: false,
          }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: size.w, height: size.h }}
          >
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              viewBox={`${contentBBox.x} ${contentBBox.y} ${contentBBox.w} ${contentBBox.h}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ background: venue.venue.background, display: 'block' }}
              onMouseDown={handleSvgMouseDown}
              onClick={handleSvgClick}
              onMouseMove={handleSvgMove}
              onMouseLeave={handleSvgLeave}
            >
              <defs>
                {flatSections.map((sec) => (
                  <clipPath key={`clip-${sec.id}`} id={`seat-clip-${sec.id}`}>
                    {sectionClipGeometry(sec)}
                  </clipPath>
                ))}
              </defs>

              {flatSections.map((sec) => (
                <SectionShape key={sec.id} section={sec} />
              ))}

              {flatSections.map((sec) => {
                const transform = sec.rotation
                  ? `rotate(${sec.rotation} ${sec.bounds.x + sec.bounds.width / 2} ${sec.bounds.y + sec.bounds.height / 2})`
                  : undefined;
                return (
                  <g
                    key={`seats-${sec.id}`}
                    transform={transform}
                    clipPath={`url(#seat-clip-${sec.id})`}
                  >
                    {sec.seats.map((seat) => (
                      <SeatMark
                        key={seat.id}
                        seat={seat}
                        section={sec}
                        selected={selectedSeatIds.has(seat.id)}
                        state={seatStates.get(seat.id) ?? 'available'}
                        shape={shape}
                        rowHover={hoveredRowIds.has(seat.id) && hover?.seatId !== seat.id}
                        isAnchor={anchorSeatId === seat.id}
                        rangePreview={rangePreviewIds.has(seat.id)}
                      />
                    ))}
                  </g>
                );
              })}

              {flatSections.map((sec) =>
                sec.labelVisible &&
                sec.bounds.width > 40 &&
                sec.bounds.height > 20 ? (
                  <SectionLabel key={`label-${sec.id}`} section={sec} />
                ) : null
              )}

              {marqueeRect && (
                <rect
                  x={marqueeRect.x}
                  y={marqueeRect.y}
                  width={marqueeRect.w}
                  height={marqueeRect.h}
                  fill="rgba(250,250,250,0.08)"
                  stroke="rgba(250,250,250,0.85)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              )}
            </svg>
          </TransformComponent>
        </TransformWrapper>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="text-[12px]">Measuring preview…</span>
        </div>
      )}

      {hover && (
        <div
          className="pointer-events-none fixed z-[60] rounded-md px-3 py-2.5 animate-fade-in"
          style={{
            left: hover.x + 16,
            top: hover.y + 16,
            minWidth: 220,
            maxWidth: 320,
            background: 'rgba(10,10,10,0.96)',
            border: '1px solid var(--border-emphasis)',
            color: 'var(--text-primary)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 10px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div
            className="text-[13px] font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {hover.label}
          </div>
          {hover.shortcuts && hover.shortcuts.length > 0 && (
            <div
              className="mt-2 flex flex-col gap-1.5 border-t pt-2"
              style={{ borderColor: 'var(--border)' }}
            >
              {hover.shortcuts.map((sc, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    {sc.keys.map((k, j) => (
                      <span key={j} className="flex items-center gap-1">
                        {j > 0 && (
                          <span
                            className="text-[10px] font-semibold"
                            style={{ color: 'var(--text-faint)' }}
                          >
                            +
                          </span>
                        )}
                        <KbdKey>{k}</KbdKey>
                      </span>
                    ))}
                  </span>
                  <span
                    className="text-[11.5px] font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {sc.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className="absolute right-3 top-3 z-[5] flex items-center gap-1 rounded-pill p-1 animate-fade-in"
        style={{
          background: 'rgba(23,23,23,0.85)',
          border: '1px solid var(--border-strong)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <IconButton onClick={zoomOut} title="Zoom out">
          <Minus size={12} weight="bold" />
        </IconButton>
        <IconButton onClick={fit} title="Fit">
          <ArrowsOut size={12} weight="bold" />
        </IconButton>
        <IconButton onClick={zoomIn} title="Zoom in">
          <Plus size={12} weight="bold" />
        </IconButton>
        <span
          className="mx-1 h-3 w-px"
          style={{ background: 'var(--border)' }}
          aria-hidden
        />
        <IconButton
          onClick={onToggleRangeMode}
          title={
            rangeMode
              ? 'Range select: on — click an anchor, then click to finish'
              : 'Range select: off — or hold Shift and click two seats'
          }
          active={rangeMode}
        >
          <SelectionPlus size={12} weight="bold" />
        </IconButton>
        <IconButton
          onClick={() => {
            setAnchorSeatId(null);
            onReset();
          }}
          title="Clear selection"
        >
          <ArrowClockwise size={12} weight="bold" />
        </IconButton>
      </div>

      <div
        className="absolute left-3 bottom-3 z-[5] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-1.5 animate-fade-in max-w-[calc(100%-1.5rem)]"
        style={{
          background: 'rgba(23,23,23,0.85)',
          border: '1px solid var(--border-strong)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <LegendDot color="var(--seat-available)" label="Available" />
        <LegendDot color="var(--seat-selected)" label="Your pick" />
        <LegendDot color="var(--seat-reserved)" label="Reserved" />
        <LegendDot color="#60a5fa" label="Accessible" />
        <span
          className="h-3 w-px"
          style={{ background: 'var(--border)' }}
          aria-hidden
        />
        <span
          className="text-[11px] tab-num"
          style={{ color: 'var(--text-secondary)' }}
        >
          {rangeMode
            ? anchorSeatId
              ? 'Range: click another seat to finish'
              : 'Range: click the first seat'
            : selectedSeatIds.size > 0
              ? `${selectedSeatIds.size} selected · shift+click for range`
              : 'Click · alt+click row · drag marquee · space pans'}
        </span>
      </div>
    </div>
  );
}

/* ─── Section shapes ─────────────────────────────────────────────── */

function SectionShape({ section }: { section: Section }) {
  const { bounds, rotation, fill, stroke, strokeWidth, opacity } = section;
  const transform = rotation
    ? `rotate(${rotation} ${bounds.x + bounds.width / 2} ${bounds.y + bounds.height / 2})`
    : undefined;

  if (section.type === 'polygon' && section.points && section.points.length >= 3) {
    const d = polygonToPath(section.points, section.edgeCurves);
    return (
      <g transform={transform} opacity={opacity}>
        <g transform={`translate(${bounds.x} ${bounds.y})`}>
          <path
            d={d}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
    );
  }

  if (section.type === 'arc' && section.arc) {
    const cx = bounds.width / 2;
    const cy = bounds.height / 2;
    const d = arcPath(
      cx,
      cy,
      section.arc.innerRadius,
      section.arc.outerRadius,
      section.arc.startAngle,
      section.arc.endAngle
    );
    return (
      <g transform={transform} opacity={opacity}>
        <g transform={`translate(${bounds.x} ${bounds.y})`}>
          <path
            d={d}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </g>
    );
  }

  if (section.type === 'circle' || section.type === 'ellipse') {
    return (
      <g transform={transform} opacity={opacity}>
        <ellipse
          cx={bounds.x + bounds.width / 2}
          cy={bounds.y + bounds.height / 2}
          rx={bounds.width / 2}
          ry={bounds.height / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const radius = typeof section.cornerRadius === 'number' ? section.cornerRadius : 6;
  return (
    <g transform={transform} opacity={opacity}>
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        rx={radius}
        ry={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

function SectionLabel({ section }: { section: Section }) {
  const { bounds, rotation } = section;
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const fontSize = Math.max(10, Math.min(16, bounds.width / 15));
  const transform = rotation ? `rotate(${rotation} ${cx} ${cy})` : undefined;
  return (
    <g transform={transform} pointerEvents="none">
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight={600}
        fill="rgba(255,255,255,0.75)"
        style={{
          paintOrder: 'stroke',
          stroke: 'rgba(0,0,0,0.55)',
          strokeWidth: 3,
          strokeLinejoin: 'round',
        }}
      >
        {section.name}
      </text>
    </g>
  );
}

/* ─── Seats ─────────────────────────────────────────────────────── */

function SeatMark({
  seat,
  section,
  selected,
  state,
  shape,
  rowHover,
  isAnchor,
  rangePreview,
}: {
  seat: Seat;
  section: Section;
  selected: boolean;
  state: SeatRuntimeState;
  shape: DemoSeatShape;
  rowHover: boolean;
  isAnchor: boolean;
  rangePreview: boolean;
}) {
  // Seats render in section-local coords because the parent <g> already
  // carries the section's rotation transform. This keeps seats aligned with
  // their section and with the hit-test math in the parent component.
  const sx = section.bounds.x + seat.bounds.x + seat.bounds.width / 2;
  const sy = section.bounds.y + seat.bounds.y + seat.bounds.height / 2;
  const r = Math.min(seat.bounds.width, seat.bounds.height) / 2;

  const fill = selected
    ? 'var(--seat-selected)'
    : rangePreview
      ? 'var(--seat-selected)'
      : state === 'reserved'
        ? 'var(--seat-reserved)'
        : state === 'disabled'
          ? 'var(--seat-disabled)'
          : state === 'accessible'
            ? '#60a5fa'
            : 'var(--seat-available)';

  const opacity =
    state === 'disabled'
      ? 0.3
      : selected || rangePreview
        ? 1
        : state === 'reserved'
          ? 0.75
          : 0.92;

  const stroke = selected || isAnchor
    ? '#ffffff'
    : rangePreview
      ? 'rgba(255,255,255,0.85)'
      : rowHover
        ? 'var(--accent, #a0c4ff)'
        : 'rgba(0,0,0,0.25)';
  const strokeWidth = selected || isAnchor ? 1.4 : rowHover || rangePreview ? 1 : 0.6;
  const clickable = state === 'available' || state === 'accessible';

  const common = {
    'data-seat-id': seat.id,
    fill,
    stroke,
    strokeWidth,
    opacity,
    vectorEffect: 'non-scaling-stroke' as const,
    style: {
      cursor: clickable ? 'pointer' : 'not-allowed',
      transition: 'fill 120ms ease, opacity 120ms ease, stroke 120ms ease',
    },
  };

  // Base shape glyph.
  let glyph: React.ReactNode;
  if (shape === 'circle') {
    glyph = <circle cx={sx} cy={sy} r={r} {...common} />;
  } else if (shape === 'square') {
    glyph = (
      <rect x={sx - r} y={sy - r} width={r * 2} height={r * 2} {...common} />
    );
  } else if (shape === 'rounded') {
    glyph = (
      <rect
        x={sx - r}
        y={sy - r}
        width={r * 2}
        height={r * 2}
        rx={r * 0.3}
        ry={r * 0.3}
        {...common}
      />
    );
  } else {
    // chair / chair-simple — drawn in a 0..24 local space then scaled.
    const scale = (r * 2) / 24;
    glyph = (
      <g
        data-seat-id={seat.id}
        transform={`translate(${sx - r} ${sy - r}) scale(${scale})`}
        style={common.style}
      >
        {shape === 'chair' ? (
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth / scale} opacity={opacity}>
            <rect x={4} y={2} width={16} height={5} rx={2} />
            <rect x={5} y={9} width={14} height={9} rx={2} />
            <rect x={2} y={8} width={4} height={10} rx={1.5} opacity={0.85} />
            <rect x={18} y={8} width={4} height={10} rx={1.5} opacity={0.85} />
          </g>
        ) : (
          <g fill={fill} stroke={stroke} strokeWidth={strokeWidth / scale} opacity={opacity}>
            <rect x={4} y={3} width={16} height={14} rx={3} />
            <rect x={4} y={17} width={4} height={4} rx={1} opacity={0.7} />
            <rect x={16} y={17} width={4} height={4} rx={1} opacity={0.7} />
          </g>
        )}
      </g>
    );
  }

  return (
    <>
      {glyph}
      {state === 'accessible' && !selected && !rangePreview && shape === 'circle' && (
        <circle
          cx={sx}
          cy={sy}
          r={r * 0.45}
          fill="none"
          stroke="#ffffff"
          strokeWidth={0.6}
          opacity={0.85}
          pointerEvents="none"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </>
  );
}

/* ─── Small UI atoms ────────────────────────────────────────────── */

function IconButton({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className="flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-base ease-soft-spring hover:bg-[var(--bg-panel-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      style={{
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
        background: active ? 'var(--accent-soft)' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Small chunky `<kbd>` pill for shortcut hints. Uses a two-tone fill so it
 * reads as a real keyboard key even on dark tooltip backdrops.
 */
function KbdKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex items-center justify-center rounded text-[11px] font-bold tab-num"
      style={{
        minWidth: 22,
        height: 20,
        padding: '0 6px',
        background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
        border: '1px solid var(--border-emphasis)',
        borderBottomWidth: 2,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono, ui-monospace, Menlo, monospace)',
        letterSpacing: '0.02em',
        boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.4)',
      }}
    >
      {children}
    </kbd>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color }}
      />
      <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
    </span>
  );
}
