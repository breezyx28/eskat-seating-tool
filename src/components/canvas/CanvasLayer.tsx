import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { SectionComponent } from './SectionComponent';
import { SeatQuickActions } from './SeatQuickActions';
import { createSection, createStage } from '@/utils/createSection';
import { getVisibleSections, flattenSections } from '@/utils/sectionTree';
import type { SectionShape, Point, StageElement } from '@/types';

interface MarqueeState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface PolygonDraft {
  points: Point[];
  cursor: Point | null;
}

interface CanvasLayerProps {
  onGenerateSeats?: (sectionId: string) => void;
  onRename?: (sectionId: string) => void;
  polygonActive?: boolean;
  onPolygonFinish?: (points: Point[]) => void;
  onPolygonCancel?: () => void;
}

export function CanvasLayer({
  onGenerateSeats,
  onRename,
  polygonActive,
  onPolygonFinish,
  onPolygonCancel,
}: CanvasLayerProps) {
  const venueData = useCanvasStore((s) => s.venueData);
  const clearSelection = useCanvasStore((s) => s.clearSelection);
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);
  const zoom = useCanvasStore((s) => s.zoom);
  const addSection = useCanvasStore((s) => s.addSection);
  const setStage = useCanvasStore((s) => s.setStage);
  const drillPath = useCanvasStore((s) => s.drillPath);
  const canvasLocked = useCanvasStore((s) => s.canvasLocked);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const visibleSections = useMemo(
    () => getVisibleSections(venueData, drillPath),
    [venueData, drillPath]
  );
  const isDrilled = drillPath.length > 0;

  const [marquee, setMarquee] = useState<MarqueeState | null>(null);
  const [polyDraft, setPolyDraft] = useState<PolygonDraft>({ points: [], cursor: null });
  const isDrawingMarquee = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collect every selected seat (plus its owning section) and flag whether
  // any sections are also selected — the floating delete chip only makes
  // sense for a pure seat selection, since sections already have their own
  // quick-actions bar.
  const { seatSelections, anySectionSelected, seatBounds } = useMemo(() => {
    if (!selectedIds.length) {
      return {
        seatSelections: [] as { sectionId: string; seatId: string }[],
        anySectionSelected: false,
        seatBounds: null as { x: number; y: number; width: number; height: number } | null,
      };
    }
    const selectedSet = new Set(selectedIds);
    const selections: { sectionId: string; seatId: string }[] = [];
    let sectionSelected = false;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const sec of flattenSections(venueData.sections)) {
      if (selectedSet.has(sec.id)) sectionSelected = true;
      for (const seat of sec.seats) {
        if (!selectedSet.has(seat.id)) continue;
        selections.push({ sectionId: sec.id, seatId: seat.id });
        // Seat bounds are section-local; add section origin for canvas coords.
        // Section rotation is intentionally ignored here to match the existing
        // marquee seat hit-test below.
        const sx = sec.bounds.x + seat.bounds.x;
        const sy = sec.bounds.y + seat.bounds.y;
        if (sx < minX) minX = sx;
        if (sy < minY) minY = sy;
        if (sx + seat.bounds.width > maxX) maxX = sx + seat.bounds.width;
        if (sy + seat.bounds.height > maxY) maxY = sy + seat.bounds.height;
      }
    }
    return {
      seatSelections: selections,
      anySectionSelected: sectionSelected,
      seatBounds: selections.length
        ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
        : null,
    };
  }, [selectedIds, venueData]);

  const showSeatQuickActions =
    !canvasLocked &&
    !marquee &&
    !anySectionSelected &&
    seatSelections.length >= 1 &&
    !!seatBounds;

  // Reset draft whenever polygon mode is toggled off externally
  React.useEffect(() => {
    if (!polygonActive) setPolyDraft({ points: [], cursor: null });
  }, [polygonActive]);

  // Keyboard: Enter/Escape while polygon active
  React.useEffect(() => {
    if (!polygonActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPolyDraft({ points: [], cursor: null });
        onPolygonCancel?.();
      } else if (e.key === 'Enter') {
        setPolyDraft((prev) => {
          if (prev.points.length >= 3) {
            onPolygonFinish?.(prev.points);
            return { points: [], cursor: null };
          }
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [polygonActive, onPolygonCancel, onPolygonFinish]);

  const localPoint = (clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (e.target !== e.currentTarget) return;

      if (polygonActive) {
        const p = localPoint(e.clientX, e.clientY);
        setPolyDraft((prev) => ({ points: [...prev.points, p], cursor: p }));
        return;
      }

      if (canvasLocked) return;

      if (!e.shiftKey) clearSelection();

      const rect = e.currentTarget.getBoundingClientRect();
      const startX = (e.clientX - rect.left) / zoom;
      const startY = (e.clientY - rect.top) / zoom;
      // Alt-drag selects seats instead of sections. We capture the modifier
      // at mousedown so mid-drag key changes don't swap target types.
      const seatMode = e.altKey;
      isDrawingMarquee.current = true;
      setMarquee({ startX, startY, endX: startX, endY: startY });

      const onMove = (me: MouseEvent) => {
        if (!isDrawingMarquee.current) return;
        const currentZoom = useCanvasStore.getState().zoom;
        setMarquee({
          startX,
          startY,
          endX: (me.clientX - rect.left) / currentZoom,
          endY: (me.clientY - rect.top) / currentZoom,
        });
      };

      const onUp = (me: MouseEvent) => {
        const currentZoom = useCanvasStore.getState().zoom;
        const endX = (me.clientX - rect.left) / currentZoom;
        const endY = (me.clientY - rect.top) / currentZoom;

        if (Math.abs(endX - startX) > 3 || Math.abs(endY - startY) > 3) {
          const minX = Math.min(startX, endX);
          const maxX = Math.max(startX, endX);
          const minY = Math.min(startY, endY);
          const maxY = Math.max(startY, endY);

          const { venueData: vd, drillPath: dp } = useCanvasStore.getState();

          if (seatMode) {
            // Hit-test every seat across every section (including nested
            // containers) — seat coords are section-local, so we offset by
            // the owning section's bounds to compare against the world rect.
            const selected: string[] = [];
            for (const sec of flattenSections(vd.sections)) {
              for (const seat of sec.seats) {
                const sx = sec.bounds.x + seat.bounds.x;
                const sy = sec.bounds.y + seat.bounds.y;
                if (
                  sx + seat.bounds.width >= minX &&
                  sx <= maxX &&
                  sy + seat.bounds.height >= minY &&
                  sy <= maxY
                ) {
                  selected.push(seat.id);
                }
              }
            }
            if (selected.length > 0) setSelectedIds(selected);
          } else {
            const pool = getVisibleSections(vd, dp);
            const selected = pool
              .filter(
                (s) =>
                  s.bounds.x + s.bounds.width >= minX &&
                  s.bounds.x <= maxX &&
                  s.bounds.y + s.bounds.height >= minY &&
                  s.bounds.y <= maxY
              )
              .map((s) => s.id);
            if (selected.length > 0) setSelectedIds(selected);
          }
        }

        isDrawingMarquee.current = false;
        setMarquee(null);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [clearSelection, setSelectedIds, zoom, polygonActive, canvasLocked]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!polygonActive) return;
      const p = localPoint(e.clientX, e.clientY);
      setPolyDraft((prev) => ({ ...prev, cursor: p }));
    },
    [polygonActive, zoom]
  );

  const handleDoubleClick = useCallback(() => {
    if (!polygonActive) return;
    setPolyDraft((prev) => {
      if (prev.points.length >= 3) {
        onPolygonFinish?.(prev.points);
        return { points: [], cursor: null };
      }
      return prev;
    });
  }, [polygonActive, onPolygonFinish]);

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (canvasLocked) return;
      if (e.dataTransfer.types.includes('application/x-eskat-shape')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    [canvasLocked]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (canvasLocked) return;
      const shapeType = e.dataTransfer.getData('application/x-eskat-shape');
      if (!shapeType) return;
      e.preventDefault();
      const p = localPoint(e.clientX, e.clientY);
      const { venueData, drillPath } = useCanvasStore.getState();
      const pool = getVisibleSections(venueData, drillPath);

      if (shapeType === 'stage') {
        if (drillPath.length) return;
        const existingStage = venueData.stage;
        if (existingStage) return;
        setStage(createStage(p.x - 200, p.y - 40));
        return;
      }

      const width =
        shapeType === 'circle'
          ? 200
          : shapeType === 'ellipse'
            ? 280
            : shapeType === 'arc'
              ? 320
              : 220;
      const height =
        shapeType === 'circle'
          ? 200
          : shapeType === 'ellipse'
            ? 140
            : shapeType === 'arc'
              ? 180
              : 160;
      const nextZ = Math.max(0, ...pool.map((s) => s.zIndex)) + 1;
      const section = createSection({
        type: shapeType as SectionShape,
        x: p.x - width / 2,
        y: p.y - height / 2,
        width,
        height,
        zIndex: nextZ,
      });
      addSection(section);
      setSelectedIds([section.id]);
    },
    [zoom, addSection, setStage, setSelectedIds, canvasLocked]
  );

  const marqueeRect = marquee
    ? {
        left: Math.min(marquee.startX, marquee.endX),
        top: Math.min(marquee.startY, marquee.endY),
        width: Math.abs(marquee.endX - marquee.startX),
        height: Math.abs(marquee.endY - marquee.startY),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{
        width: venueData.venue.width,
        height: venueData.venue.height,
        cursor: polygonActive ? 'crosshair' : 'default',
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {venueData.stage && !isDrilled && (
        <StageRenderer stage={venueData.stage} />
      )}

      {[...visibleSections]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((section) => (
          <SectionComponent
            key={section.id}
            section={section}
            onGenerateSeats={onGenerateSeats}
            onRename={onRename}
          />
        ))}

      {marqueeRect && (
        <div
          className="absolute pointer-events-none"
          style={{
            ...marqueeRect,
            border: '1px solid rgba(250,250,250,0.6)',
            background: 'rgba(250,250,250,0.06)',
            boxShadow: 'inset 0 0 0 1px rgba(15,15,15,0.65)',
          }}
        />
      )}

      {showSeatQuickActions && seatBounds && (
        <SeatQuickActions
          selections={seatSelections}
          position={{ x: seatBounds.x + seatBounds.width / 2, y: seatBounds.y }}
        />
      )}

      {polygonActive && polyDraft.points.length > 0 && (
        <PolygonDraftOverlay
          points={polyDraft.points}
          cursor={polyDraft.cursor}
          width={venueData.venue.width}
          height={venueData.venue.height}
        />
      )}
    </div>
  );
}

function StageRenderer({ stage }: { stage: StageElement }) {
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);
  const isSelected = useCanvasStore((s) => s.selectedIds.includes(stage.id));
  return (
    <div
      className="absolute flex items-center justify-center text-xs mono-label"
      style={{
        left: stage.bounds.x,
        top: stage.bounds.y,
        width: stage.bounds.width,
        height: stage.bounds.height,
        background: stage.fill,
        color: 'rgba(250,250,250,0.9)',
        border: isSelected ? '1.5px solid var(--text-primary)' : '1px solid var(--border-strong)',
        borderRadius: 8,
        letterSpacing: 4,
        cursor: 'pointer',
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        setSelectedIds([stage.id]);
      }}
    >
      {stage.label || 'STAGE'}
    </div>
  );
}

function PolygonDraftOverlay({
  points,
  cursor,
  width,
  height,
}: {
  points: Point[];
  cursor: Point | null;
  width: number;
  height: number;
}) {
  const pathPoints = [...points];
  if (cursor) pathPoints.push(cursor);
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      width={width}
      height={height}
      style={{ overflow: 'visible' }}
    >
      <polyline
        points={pathPoints.map((p) => `${p.x},${p.y}`).join(' ')}
        stroke="var(--text-primary)"
        strokeWidth={1.5}
        fill="rgba(250,250,250,0.06)"
        strokeDasharray="5 3"
        vectorEffect="non-scaling-stroke"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="var(--bg-panel-raised)"
          stroke="var(--text-primary)"
          strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}
