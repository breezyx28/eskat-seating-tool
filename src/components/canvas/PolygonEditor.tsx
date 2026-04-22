import { useCallback, useRef } from 'react';
import type { Section, Point, EdgeCurve } from '@/types';
import { useCanvasStore } from '@/store/canvasStore';
import { edgeMidpoint, polygonToPath } from '@/utils/polygonPath';

interface PolygonEditorProps {
  section: Section;
}

/**
 * Overlay shown above a selected polygon section. Vertex and edge handles let
 * the user move points, convert edges to cubic beziers, and insert / remove
 * vertices. All coordinates are expressed in the section's LOCAL bounds.
 */
export function PolygonEditor({ section }: PolygonEditorProps) {
  const zoom = useCanvasStore((s) => s.zoom);
  const updateSectionNoHistory = useCanvasStore((s) => s.updateSectionNoHistory);
  const commitHistory = useCanvasStore((s) => s.commitHistory);

  const dragState = useRef<null | {
    kind: 'vertex' | 'edge' | 'cp1' | 'cp2';
    index: number;
    start: Point;
    origin: Point;
    originCurve?: EdgeCurve;
  }>(null);

  if (section.type !== 'polygon' || !section.points || section.points.length < 3) return null;

  const points = section.points;
  const curves = section.edgeCurves ?? {};

  const startDrag = useCallback(
    (e: React.MouseEvent, kind: NonNullable<typeof dragState.current>['kind'], index: number) => {
      e.stopPropagation();
      e.preventDefault();
      const origin =
        kind === 'vertex'
          ? { ...points[index] }
          : kind === 'edge'
            ? { ...edgeMidpoint(points, index, curves) }
            : kind === 'cp1'
              ? { ...(curves[index]?.cp1 ?? { x: 0, y: 0 }) }
              : { ...(curves[index]?.cp2 ?? { x: 0, y: 0 }) };

      dragState.current = {
        kind,
        index,
        start: { x: e.clientX, y: e.clientY },
        origin,
        originCurve: curves[index] ? { ...curves[index] } : undefined,
      };

      const onMove = (me: MouseEvent) => {
        if (!dragState.current) return;
        const scale = useCanvasStore.getState().zoom;
        const dx = (me.clientX - dragState.current.start.x) / scale;
        const dy = (me.clientY - dragState.current.start.y) / scale;
        const latestSection = findSection(section.id);
        if (!latestSection || !latestSection.points) return;

        if (dragState.current.kind === 'vertex') {
          const nextPoints = latestSection.points.slice();
          nextPoints[dragState.current.index] = {
            x: dragState.current.origin.x + dx,
            y: dragState.current.origin.y + dy,
          };
          updateSectionNoHistory(section.id, { points: nextPoints });
        } else if (dragState.current.kind === 'edge') {
          // Promote edge to a cubic bezier anchored at a deflected midpoint
          const i = dragState.current.index;
          const a = latestSection.points[i];
          const b = latestSection.points[(i + 1) % latestSection.points.length];
          const mid = {
            x: dragState.current.origin.x + dx,
            y: dragState.current.origin.y + dy,
          };
          const cp1 = { x: a.x + (mid.x - a.x) * 1.2, y: a.y + (mid.y - a.y) * 1.2 };
          const cp2 = { x: b.x + (mid.x - b.x) * 1.2, y: b.y + (mid.y - b.y) * 1.2 };
          updateSectionNoHistory(section.id, {
            edgeCurves: { ...(latestSection.edgeCurves ?? {}), [i]: { cp1, cp2 } },
          });
        } else {
          const i = dragState.current.index;
          const originCurve = dragState.current.originCurve!;
          const nextCurves = { ...(latestSection.edgeCurves ?? {}) };
          if (dragState.current.kind === 'cp1') {
            nextCurves[i] = {
              cp1: { x: originCurve.cp1.x + dx, y: originCurve.cp1.y + dy },
              cp2: originCurve.cp2,
            };
          } else {
            nextCurves[i] = {
              cp1: originCurve.cp1,
              cp2: { x: originCurve.cp2.x + dx, y: originCurve.cp2.y + dy },
            };
          }
          updateSectionNoHistory(section.id, { edgeCurves: nextCurves });
        }
      };

      const onUp = () => {
        dragState.current = null;
        commitHistory();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [section.id, points, curves, updateSectionNoHistory, commitHistory]
  );

  const removeVertex = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (points.length <= 3) return;
    const next = points.filter((_, idx) => idx !== i);
    // Re-index edgeCurves
    const nextCurves: Record<number, EdgeCurve> = {};
    for (const k of Object.keys(curves)) {
      const idx = Number(k);
      if (idx < i) nextCurves[idx] = curves[idx];
      else if (idx > i) nextCurves[idx - 1] = curves[idx];
    }
    updateSectionNoHistory(section.id, { points: next, edgeCurves: nextCurves });
    commitHistory();
  };

  const insertVertex = (e: React.MouseEvent, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    const mid = edgeMidpoint(points, i, curves);
    const next = [...points.slice(0, i + 1), mid, ...points.slice(i + 1)];
    const nextCurves: Record<number, EdgeCurve> = {};
    for (const k of Object.keys(curves)) {
      const idx = Number(k);
      if (idx < i) nextCurves[idx] = curves[idx];
      else if (idx > i) nextCurves[idx + 1] = curves[idx];
    }
    updateSectionNoHistory(section.id, { points: next, edgeCurves: nextCurves });
    commitHistory();
  };

  const handleSize = Math.max(6, 10 / zoom);

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${section.bounds.width} ${section.bounds.height}`}
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      {/* Outline re-render for visual feedback */}
      <path
        d={polygonToPath(points, curves)}
        fill="none"
        stroke="var(--text-primary)"
        strokeWidth={1}
        strokeDasharray="4 4"
        vectorEffect="non-scaling-stroke"
      />

      {/* Bezier control lines */}
      {Object.entries(curves).map(([k, c]) => {
        const i = Number(k);
        const a = points[i];
        const b = points[(i + 1) % points.length];
        return (
          <g key={`cp-line-${i}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={c.cp1.x}
              y2={c.cp1.y}
              stroke="var(--text-muted)"
              strokeOpacity={0.6}
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={b.x}
              y1={b.y}
              x2={c.cp2.x}
              y2={c.cp2.y}
              stroke="var(--text-muted)"
              strokeOpacity={0.6}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}

      {/* Vertex handles — solid square, monochrome */}
      {points.map((p, i) => (
        <rect
          key={`v-${i}`}
          x={p.x - handleSize / 2}
          y={p.y - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="var(--text-primary)"
          stroke="#0f0f0f"
          strokeWidth={1}
          style={{ cursor: 'grab', pointerEvents: 'auto' }}
          onMouseDown={(e) => startDrag(e, 'vertex', i)}
          onContextMenu={(e) => removeVertex(e, i)}
        />
      ))}

      {/* Mid-edge "bend" handles — hollow circle */}
      {points.map((_, i) => {
        const m = edgeMidpoint(points, i, curves);
        return (
          <circle
            key={`e-${i}`}
            cx={m.x}
            cy={m.y}
            r={handleSize / 2}
            fill="var(--bg-panel-raised)"
            stroke="var(--text-primary)"
            strokeWidth={1.5}
            style={{ cursor: 'grab', pointerEvents: 'auto' }}
            onMouseDown={(e) => startDrag(e, 'edge', i)}
            onDoubleClick={(e) => insertVertex(e, i)}
          />
        );
      })}

      {/* Bezier control point handles — brand accent for differentiation */}
      {Object.entries(curves).map(([k, c]) => {
        const i = Number(k);
        return (
          <g key={`cp-${i}`}>
            <circle
              cx={c.cp1.x}
              cy={c.cp1.y}
              r={handleSize / 2.5}
              fill="var(--accent)"
              stroke="#0f0f0f"
              strokeWidth={1}
              style={{ cursor: 'grab', pointerEvents: 'auto' }}
              onMouseDown={(e) => startDrag(e, 'cp1', i)}
            />
            <circle
              cx={c.cp2.x}
              cy={c.cp2.y}
              r={handleSize / 2.5}
              fill="var(--accent)"
              stroke="#0f0f0f"
              strokeWidth={1}
              style={{ cursor: 'grab', pointerEvents: 'auto' }}
              onMouseDown={(e) => startDrag(e, 'cp2', i)}
            />
          </g>
        );
      })}
    </svg>
  );
}

function findSection(id: string): Section | null {
  const venue = useCanvasStore.getState().venueData;
  let out: Section | null = null;
  const walk = (list: Section[]) => {
    for (const s of list) {
      if (s.id === id) {
        out = s;
        return;
      }
      if (s.children) walk(s.children);
    }
  };
  walk(venue.sections);
  return out;
}
