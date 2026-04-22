import React, { useCallback } from 'react';
import type { Seat as SeatType, SeatIcon, CustomSeatIcon, Section } from '@/types';
import { ChairIcon, ChairSimpleIcon, WheelchairIcon } from '@/assets/icons/ChairIcon';
import { useCanvasStore } from '@/store/canvasStore';

/**
 * Paints a dashed accent outline on every seat that shares `rowLabel` with
 * the hovered seat inside the same section. DOM-first so the 18k-seat
 * templates don't pay a React re-render tax on every hover move.
 */
function highlightRow(sectionId: string, rowLabel: string, on: boolean) {
  if (!rowLabel) return;
  const escSection = (window.CSS?.escape ?? ((v: string) => v))(sectionId);
  const escRow = (window.CSS?.escape ?? ((v: string) => v))(rowLabel);
  const nodes = document.querySelectorAll<HTMLElement>(
    `[data-section-id="${escSection}"][data-row-label="${escRow}"]`
  );
  if (on) {
    nodes.forEach((n) => n.setAttribute('data-row-hover', 'true'));
  } else {
    nodes.forEach((n) => n.removeAttribute('data-row-hover'));
  }
}

/** Walks the section tree to locate the section that owns the given seat id. */
function findSeatSection(sections: Section[], seatId: string): Section | null {
  for (const sec of sections) {
    if (sec.seats.some((s) => s.id === seatId)) return sec;
    if (sec.children?.length) {
      const found = findSeatSection(sec.children, seatId);
      if (found) return found;
    }
  }
  return null;
}

interface SeatProps {
  seat: SeatType;
  sectionId: string;
  icon?: SeatIcon;
  customIcon?: CustomSeatIcon;
}

const STATE_COLORS: Record<string, string> = {
  available: 'var(--seat-available)',
  reserved: 'var(--seat-reserved)',
  disabled: 'var(--seat-disabled)',
};

export const SeatComponent = React.memo(function SeatComponent({
  seat,
  sectionId,
  icon = 'chair',
  customIcon,
}: SeatProps) {
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);
  const addToSelection = useCanvasStore((s) => s.addToSelection);
  const removeFromSelection = useCanvasStore((s) => s.removeFromSelection);
  const venueData = useCanvasStore((s) => s.venueData);

  const isSelected = selectedIds.includes(seat.id);
  const color = isSelected ? 'var(--seat-selected)' : STATE_COLORS[seat.state];

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Shift / Ctrl / Meta — additive toggle (same behaviour for all, matches
      // common design-tool conventions). Alt — select every seat in the same
      // row of the same section.
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        if (isSelected) removeFromSelection(seat.id);
        else addToSelection(seat.id);
        return;
      }
      if (e.altKey) {
        const section = findSeatSection(venueData.sections, seat.id);
        if (section) {
          const rowIds = section.seats
            .filter((s) => s.rowLabel === seat.rowLabel)
            .map((s) => s.id);
          setSelectedIds(rowIds);
          return;
        }
      }
      setSelectedIds([seat.id]);
    },
    [seat.id, seat.rowLabel, isSelected, addToSelection, removeFromSelection, setSelectedIds, venueData]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (seat.rowLabel) highlightRow(sectionId, seat.rowLabel, true);
  }, [sectionId, seat.rowLabel]);

  const handleMouseLeave = useCallback(() => {
    if (seat.rowLabel) highlightRow(sectionId, seat.rowLabel, false);
  }, [sectionId, seat.rowLabel]);

  const size = Math.min(seat.bounds.width, seat.bounds.height);

  const tooltip = [
    `${seat.label} — ${seat.state}`,
    seat.accessible ? 'accessible' : null,
    seat.rowLabel ? 'Alt+Click: select row' : null,
    'Shift/Ctrl+Click: add',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      className="absolute flex items-center justify-center group"
      style={{
        left: seat.bounds.x,
        top: seat.bounds.y,
        width: seat.bounds.width,
        height: seat.bounds.height,
        cursor: 'pointer',
        opacity: seat.state === 'disabled' ? 0.45 : 1,
        transition: 'transform 0.1s ease',
      }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={tooltip}
      data-seat-id={seat.id}
      data-section-id={sectionId}
      data-row-label={seat.rowLabel ?? ''}
      data-selected={isSelected ? 'true' : undefined}
    >
      {isSelected && (
        <div
          className="absolute"
          style={{
            inset: -3,
            boxShadow: '0 0 0 1.5px var(--text-primary), 0 0 0 2.5px #0f0f0f',
            borderRadius: icon === 'circle' ? '50%' : 4,
            pointerEvents: 'none',
          }}
        />
      )}

      {icon === 'chair' && <ChairIcon color={color} size={size} />}
      {icon === 'chair-simple' && <ChairSimpleIcon color={color} size={size} />}
      {icon === 'circle' && (
        <div
          className="rounded-full transition-opacity group-hover:opacity-80"
          style={{ background: color, width: size, height: size }}
        />
      )}
      {icon === 'square' && (
        <div
          className="transition-opacity group-hover:opacity-80"
          style={{ background: color, width: size, height: size }}
        />
      )}
      {icon === 'rounded' && (
        <div
          className="transition-opacity group-hover:opacity-80"
          style={{ background: color, width: size, height: size, borderRadius: 4 }}
        />
      )}
      {icon === 'custom' && customIcon?.svg && (
        <div
          className="transition-opacity group-hover:opacity-80"
          style={{ width: size, height: size, color }}
          dangerouslySetInnerHTML={{ __html: customIcon.svg }}
        />
      )}

      {seat.accessible && (
        <div
          className="absolute -top-1 -right-1 rounded-full flex items-center justify-center"
          style={{
            background: '#0ea5e9',
            width: Math.max(10, size * 0.35),
            height: Math.max(10, size * 0.35),
            pointerEvents: 'none',
          }}
        >
          <WheelchairIcon size={Math.max(8, size * 0.28)} color="#fff" />
        </div>
      )}
    </div>
  );
});
