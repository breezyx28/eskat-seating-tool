import React, { useState, useRef, useCallback } from 'react';
import type { Section } from '@/types';
import { SeatComponent } from './Seat';
import { SectionContextMenu } from './SectionContextMenu';
import { SeatContextMenu } from './SeatContextMenu';
import { useCanvasStore } from '@/store/canvasStore';
import { useSnapToGrid } from '@/hooks/useSnapToGrid';
import { renderPattern } from '@/utils/patterns';
import { polygonToPath } from '@/utils/polygonPath';
import { ArcRenderer } from './ArcRenderer';
import { PolygonEditor } from './PolygonEditor';
import { isContainer } from '@/utils/sectionTree';
import { SectionQuickActions } from './SectionQuickActions';
import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';

interface SectionProps {
  section: Section;
  onGenerateSeats?: (sectionId: string) => void;
  onRename?: (sectionId: string) => void;
}

export function SectionComponent({ section, onGenerateSeats, onRename }: SectionProps) {
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);
  const addToSelection = useCanvasStore((s) => s.addToSelection);
  const removeFromSelection = useCanvasStore((s) => s.removeFromSelection);
  const updateSectionNoHistory = useCanvasStore((s) => s.updateSectionNoHistory);
  const commitHistory = useCanvasStore((s) => s.commitHistory);
  const zoom = useCanvasStore((s) => s.zoom);
  const venueData = useCanvasStore((s) => s.venueData);
  const drillInto = useCanvasStore((s) => s.drillInto);
  const clearSectionSeats = useCanvasStore((s) => s.clearSectionSeats);
  const canvasLocked = useCanvasStore((s) => s.canvasLocked);

  const { snapPoint } = useSnapToGrid();
  const isSelected = selectedIds.includes(section.id);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [seatContextMenu, setSeatContextMenu] = useState<{
    seatId: string;
    x: number;
    y: number;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  // Hide the floating quick-actions bar while the user is actively dragging —
  // the bar is distracting and would trap cursor events during the drag.
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const dragStart = useRef<{
    mouseX: number;
    mouseY: number;
    anchors: Map<string, { x: number; y: number }>;
  } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('[data-seat-id]')) return;
      e.stopPropagation();

      const locked = useCanvasStore.getState().canvasLocked;
      const currentSelection = useCanvasStore.getState().selectedIds;
      let selection = currentSelection;

      if (e.shiftKey) {
        if (currentSelection.includes(section.id)) {
          removeFromSelection(section.id);
          selection = currentSelection.filter((id) => id !== section.id);
        } else {
          addToSelection(section.id);
          selection = [...currentSelection, section.id];
        }
      } else if (!currentSelection.includes(section.id)) {
        setSelectedIds([section.id]);
        selection = [section.id];
      }

      // When locked, allow selection (so the quick-actions menu stays usable)
      // but do NOT start a drag.
      if (locked) return;

      const data = useCanvasStore.getState().venueData;
      const selectedSectionIds = selection.filter((id) =>
        data.sections.some((s) => s.id === id)
      );
      const anchors = new Map<string, { x: number; y: number }>();
      for (const id of selectedSectionIds) {
        const sec = data.sections.find((s) => s.id === id);
        if (sec) anchors.set(id, { x: sec.bounds.x, y: sec.bounds.y });
      }
      if (anchors.size === 0) {
        anchors.set(section.id, { x: section.bounds.x, y: section.bounds.y });
      }

      isDraggingRef.current = false;
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        anchors,
      };

      const onMove = (me: MouseEvent) => {
        if (!dragStart.current) return;
        const currentZoom = useCanvasStore.getState().zoom;
        const dx = (me.clientX - dragStart.current.mouseX) / currentZoom;
        const dy = (me.clientY - dragStart.current.mouseY) / currentZoom;
        if (!isDraggingRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
          isDraggingRef.current = true;
          setIsDragging(true);
        }
        if (!isDraggingRef.current) return;

        const d = useCanvasStore.getState().venueData;
        for (const [id, anchor] of dragStart.current.anchors) {
          const sec = d.sections.find((s) => s.id === id);
          if (!sec) continue;
          const snapped = snapPoint(anchor.x + dx, anchor.y + dy);
          updateSectionNoHistory(id, {
            bounds: { ...sec.bounds, x: snapped.x, y: snapped.y },
          });
        }
      };

      const onUp = () => {
        if (isDraggingRef.current) {
          commitHistory();
        }
        dragStart.current = null;
        isDraggingRef.current = false;
        setIsDragging(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [section.id, section.bounds.x, section.bounds.y, setSelectedIds, addToSelection, removeFromSelection, snapPoint, updateSectionNoHistory, commitHistory]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const seatEl = (e.target as HTMLElement).closest('[data-seat-id]') as HTMLElement | null;
    if (seatEl) {
      const seatId = seatEl.getAttribute('data-seat-id');
      if (seatId) {
        setSeatContextMenu({ seatId, x: e.clientX, y: e.clientY });
        return;
      }
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const getShapeStyle = (): React.CSSProperties => {
    if (section.type === 'circle' || section.type === 'ellipse') {
      return { borderRadius: '50%' };
    }
    const radius = typeof section.cornerRadius === 'number' ? section.cornerRadius : 6;
    return { borderRadius: radius };
  };

  const showLabel =
    section.labelVisible && section.bounds.width > 40 && section.bounds.height > 20;
  const labelFontSize = Math.max(10, Math.min(16, section.bounds.width / 15));

  const isPolygon = section.type === 'polygon' && section.points && section.points.length >= 3;
  const isArc = section.type === 'arc' && !!section.arc;
  const container = isContainer(section);
  const pattern = renderPattern(section.pattern, section.id);
  const hoverScale = section.interactions?.hoverScale;
  const tooltip = section.interactions?.tooltip;
  const [isHovered, setIsHovered] = useState(false);
  const effectiveScale =
    isHovered && hoverScale && hoverScale !== 1 ? hoverScale : 1;

  return (
    <>
      <div
        className="absolute select-none no-select"
        title={tooltip || undefined}
        style={{
          left: section.bounds.x,
          top: section.bounds.y,
          width: section.bounds.width,
          height: section.bounds.height,
          background: isPolygon || isArc ? 'transparent' : section.fill,
          opacity: section.opacity,
          border: !isPolygon && !isArc
            ? isSelected
              ? `1.5px solid var(--text-primary)`
              : `${section.strokeWidth}px solid ${section.stroke}`
            : 'none',
          boxShadow:
            isSelected && !isPolygon && !isArc
              ? '0 0 0 1px rgba(250,250,250,0.14)'
              : 'none',
          cursor: 'move',
          transform: [
            section.rotation ? `rotate(${section.rotation}deg)` : '',
            effectiveScale !== 1 ? `scale(${effectiveScale})` : '',
          ]
            .filter(Boolean)
            .join(' ') || undefined,
          transformOrigin: 'center center',
          zIndex: section.zIndex,
          transition: hoverScale && hoverScale !== 1 ? 'transform 0.15s ease' : undefined,
          ...getShapeStyle(),
        }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDoubleClick={(e) => {
          if (container) {
            e.stopPropagation();
            drillInto(section.id);
          }
        }}
      >
        {/* Pattern fill overlay — sits above the background, below the border/label */}
        {pattern.fill && !isPolygon && !isArc && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            <defs dangerouslySetInnerHTML={{ __html: pattern.svgDefs }} />
            <rect
              width="100%"
              height="100%"
              fill={pattern.fill}
              rx={section.type === 'rectangle' ? (section.cornerRadius ?? 6) : 0}
              ry={section.type === 'rectangle' ? (section.cornerRadius ?? 6) : 0}
            />
          </svg>
        )}

        {/* Polygon rendering — with optional bezier edges */}
        {isPolygon && section.points && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-auto"
            viewBox={`0 0 ${section.bounds.width} ${section.bounds.height}`}
            preserveAspectRatio="none"
          >
            {pattern.fill && <defs dangerouslySetInnerHTML={{ __html: pattern.svgDefs }} />}
            <path
              d={polygonToPath(section.points, section.edgeCurves)}
              fill={section.fill}
              stroke={isSelected ? 'var(--text-primary)' : section.stroke}
              strokeWidth={isSelected ? 1.5 : section.strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
            {pattern.fill && (
              <path d={polygonToPath(section.points, section.edgeCurves)} fill={pattern.fill} />
            )}
          </svg>
        )}

        {/* Arc rendering */}
        {isArc && section.arc && (
          <ArcRenderer
            section={section}
            isSelected={isSelected}
            patternDefs={pattern.svgDefs}
            patternFill={pattern.fill}
          />
        )}

        {/* Container badge — shown on container sections */}
        {container && (
          <div
            className="absolute top-1 right-1 px-1.5 py-0.5 rounded-sm text-[9px] font-semibold pointer-events-none tab-num"
            style={{
              background: 'var(--bg-panel-raised)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-strong)',
              letterSpacing: 0.3,
            }}
          >
            {section.children!.length}
          </div>
        )}

        {showLabel && (
          <div
            className="absolute top-1 left-0 right-0 text-center font-semibold pointer-events-none tracking-wide"
            style={{
              color: 'rgba(255,255,255,0.95)',
              textShadow: '0 1px 3px rgba(0,0,0,0.85)',
              fontSize: labelFontSize,
              top: section.seats.length > 0 ? -18 : '50%',
              transform: section.seats.length > 0 ? undefined : 'translateY(-50%)',
            }}
          >
            {section.name}
            {section.price > 0 && (
              <span className="ml-2 opacity-75 font-normal" style={{ fontSize: labelFontSize * 0.8 }}>
                {section.currency}
                {section.price}
              </span>
            )}
          </div>
        )}

        {section.seats.map((seat) => (
          <SeatComponent
            key={seat.id}
            seat={seat}
            sectionId={section.id}
            icon={section.seatIcon ?? 'chair'}
            customIcon={section.customSeatIcon}
          />
        ))}

        {isSelected && isPolygon && <PolygonEditor section={section} />}

        {isSelected && (
          <div
            className="absolute bottom-0 right-0 cursor-se-resize"
            style={{
              background: 'var(--text-primary)',
              border: '1px solid #0f0f0f',
              width: Math.max(7, 8 / zoom),
              height: Math.max(7, 8 / zoom),
              margin: 2,
              pointerEvents: 'none',
            }}
          />
        )}

        {isSelected && !isDragging && !canvasLocked && selectedIds.length === 1 && (
          <SectionQuickActions
            section={section}
            onRename={() => onRename?.(section.id)}
            onProperties={() => onGenerateSeats?.(section.id)}
            onRequestClearSeats={() => setConfirmClear(true)}
          />
        )}
      </div>

      {contextMenu && (
        <SectionContextMenu
          sectionId={section.id}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onGenerateSeats={() => onGenerateSeats?.(section.id)}
          onRename={() => onRename?.(section.id)}
        />
      )}

      {seatContextMenu && venueData && (
        <SeatContextMenu
          sectionId={section.id}
          seatId={seatContextMenu.seatId}
          position={{ x: seatContextMenu.x, y: seatContextMenu.y }}
          onClose={() => setSeatContextMenu(null)}
        />
      )}

      <ConfirmDialog
        open={confirmClear}
        title={`Clear seats on "${section.name}"?`}
        description={`This will remove all ${section.seats.length} seats from this section. The section itself is kept.`}
        confirmLabel="Clear seats"
        danger
        onConfirm={() => {
          clearSectionSeats(section.id);
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}
