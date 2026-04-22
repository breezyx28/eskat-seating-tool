import { Trash } from '@phosphor-icons/react';
import { useCanvasStore } from '@/store/canvasStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  selections: { sectionId: string; seatId: string }[];
  position: { x: number; y: number };
}

/**
 * Floating delete chip for a seat-only selection. Positioned in canvas-local
 * coordinates so it can span sections (seats in different sections are still
 * handled by the single `deleteSeats` store action). Uses `scale(1/zoom)` so
 * the pill keeps a fixed screen size at any zoom level, matching the behavior
 * of SectionQuickActions.
 */
export function SeatQuickActions({ selections, position }: Props) {
  const zoom = useCanvasStore((s) => s.zoom);
  const deleteSeats = useCanvasStore((s) => s.deleteSeats);

  const inverseScale = 1 / Math.max(0.1, zoom);
  const count = selections.length;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -100%) scale(${inverseScale})`,
        transformOrigin: 'bottom center',
        paddingBottom: 8,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div
        className="pointer-events-auto flex items-center gap-[2px] px-[4px] py-[4px] rounded-pill whitespace-nowrap animate-fade-in"
        style={{
          background: 'rgba(23, 23, 23, 0.92)',
          border: '1px solid var(--border-strong)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => deleteSeats(selections.map((s) => s.seatId))}
              className="flex items-center gap-1.5 h-[26px] px-2.5 rounded-full transition-[background-color,color,transform] duration-base ease-soft-spring active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]"
              style={{ color: 'var(--danger)', background: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--danger-soft)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Trash size={13} weight="bold" />
              <span className="text-[11px] font-medium tab-num">
                Delete {count} seat{count > 1 ? 's' : ''}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Delete selected seats (Del)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
