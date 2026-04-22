import { useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { Trash, CheckCircle, XCircle, Prohibit, Wheelchair } from '@phosphor-icons/react';
import type { SeatState } from '@/types';
import { flattenSections, findSectionById } from '@/utils/sectionTree';

interface Props {
  sectionId: string;
  seatId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function SeatContextMenu({ sectionId, seatId, position, onClose }: Props) {
  const updateSeat = useCanvasStore((s) => s.updateSeat);
  const updateSeats = useCanvasStore((s) => s.updateSeats);
  const deleteSeats = useCanvasStore((s) => s.deleteSeats);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const venueData = useCanvasStore((s) => s.venueData);
  const ref = useRef<HTMLDivElement>(null);

  const section = findSectionById(venueData, sectionId);
  const seat = section?.seats.find((s) => s.id === seatId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', key);
    };
  }, [onClose]);

  const setState = (state: SeatState) => {
    const ids = selectedIds.includes(seatId) ? selectedIds : [seatId];
    if (ids.length === 1) {
      updateSeat(sectionId, seatId, { state });
    } else {
      for (const sec of flattenSections(venueData.sections)) {
        const matches = sec.seats.filter((s) => ids.includes(s.id));
        if (matches.length === 0) continue;
        updateSeats(sec.id, (seats) =>
          seats.map((s) => (ids.includes(s.id) ? { ...s, state } : s))
        );
      }
    }
    onClose();
  };

  const toggleAccessible = () => {
    if (!seat) return;
    updateSeat(sectionId, seatId, { accessible: !seat.accessible });
    onClose();
  };

  const hoverIn = (danger?: boolean) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = danger
      ? 'var(--danger-soft)'
      : 'var(--bg-panel-hover)';
  };
  const hoverOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent';
  };

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-md py-1 min-w-[200px] animate-fade-in"
      style={{
        left: position.x,
        top: position.y,
        background: 'var(--bg-panel-raised)',
        border: '1px solid var(--border-strong)',
      }}
    >
      <div className="px-3 pt-2 pb-1 mono-label" style={{ color: 'var(--text-muted)' }}>
        Set state
      </div>
      <button
        className="flex items-center gap-2.5 w-full px-3 py-[7px] text-[12px] transition-colors text-left"
        style={{ color: 'var(--text-primary)' }}
        onMouseEnter={hoverIn()}
        onMouseLeave={hoverOut}
        onClick={() => setState('available')}
      >
        <CheckCircle size={14} weight="fill" style={{ color: 'var(--seat-available)' }} />
        <span>Available</span>
      </button>
      <button
        className="flex items-center gap-2.5 w-full px-3 py-[7px] text-[12px] transition-colors text-left"
        style={{ color: 'var(--text-primary)' }}
        onMouseEnter={hoverIn()}
        onMouseLeave={hoverOut}
        onClick={() => setState('reserved')}
      >
        <XCircle size={14} weight="fill" style={{ color: 'var(--seat-reserved)' }} />
        <span>Reserved</span>
      </button>
      <button
        className="flex items-center gap-2.5 w-full px-3 py-[7px] text-[12px] transition-colors text-left"
        style={{ color: 'var(--text-primary)' }}
        onMouseEnter={hoverIn()}
        onMouseLeave={hoverOut}
        onClick={() => setState('disabled')}
      >
        <Prohibit size={14} style={{ color: 'var(--text-muted)' }} />
        <span>Disabled</span>
      </button>
      <div className="my-1" style={{ height: 1, background: 'var(--border)' }} />
      <button
        className="flex items-center gap-2.5 w-full px-3 py-[7px] text-[12px] transition-colors text-left"
        style={{ color: 'var(--text-primary)' }}
        onMouseEnter={hoverIn()}
        onMouseLeave={hoverOut}
        onClick={toggleAccessible}
      >
        <Wheelchair size={14} style={{ color: 'var(--text-muted)' }} />
        <span>{seat?.accessible ? 'Remove accessibility' : 'Mark accessible'}</span>
      </button>
      <div className="my-1" style={{ height: 1, background: 'var(--border)' }} />
      <button
        className="flex items-center gap-2.5 w-full px-3 py-[7px] text-[12px] transition-colors text-left"
        style={{ color: 'var(--danger)' }}
        onMouseEnter={hoverIn(true)}
        onMouseLeave={hoverOut}
        onClick={() => {
          const ids = selectedIds.includes(seatId) ? selectedIds : [seatId];
          deleteSeats(ids);
          onClose();
        }}
      >
        <Trash size={14} weight="bold" />
        <span>Delete seat{selectedIds.length > 1 ? 's' : ''}</span>
      </button>
    </div>
  );
}
