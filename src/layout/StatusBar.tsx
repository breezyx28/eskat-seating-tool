import { useCanvasStore } from '@/store/canvasStore';
import { CircleNotch, Check } from '@phosphor-icons/react';

export function StatusBar() {
  const cursorPosition = useCanvasStore((s) => s.cursorPosition);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const zoom = useCanvasStore((s) => s.zoom);
  const lastSavedAt = useCanvasStore((s) => s.lastSavedAt);
  const dirty = useCanvasStore((s) => s.dirty);
  const sectionsCount = useCanvasStore((s) => s.venueData.sections.length);
  const seatsCount = useCanvasStore((s) =>
    s.venueData.sections.reduce((n, sec) => n + sec.seats.length, 0)
  );

  const savedLabel = lastSavedAt
    ? dirty
      ? 'Unsaved changes'
      : `Saved ${formatAgo(lastSavedAt)}`
    : dirty
      ? 'Unsaved'
      : 'No changes';

  const SavedIcon = dirty ? CircleNotch : Check;

  return (
    <footer
      className="flex items-center justify-between px-3 h-7 shrink-0 border-t"
      style={{
        background: 'var(--bg-panel)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Left cluster — geometry stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="mono-label mono-label--tight">XY</span>
          <span
            className="text-[11px] tab-num"
            style={{ color: 'var(--text-secondary)' }}
          >
            {cursorPosition.x}, {cursorPosition.y}
          </span>
        </div>

        <div className="hairline--vertical" style={{ height: 12 }} />

        <div className="flex items-center gap-1.5">
          <span className="mono-label mono-label--tight">Sections</span>
          <span
            className="text-[11px] tab-num"
            style={{ color: 'var(--text-primary)' }}
          >
            {sectionsCount}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="mono-label mono-label--tight">Seats</span>
          <span
            className="text-[11px] tab-num"
            style={{ color: 'var(--text-primary)' }}
          >
            {seatsCount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Right cluster — selection + save */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="mono-label mono-label--tight">Selected</span>
          <span
            className="text-[11px] tab-num"
            style={{
              color: selectedIds.length ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {selectedIds.length || '—'}
          </span>
        </div>

        <div className="hairline--vertical" style={{ height: 12 }} />

        <div
          className="flex items-center gap-1.5 text-[11px]"
          style={{
            color: dirty ? 'var(--warning)' : 'var(--text-muted)',
          }}
        >
          <SavedIcon size={10} weight={dirty ? 'regular' : 'bold'} />
          <span>{savedLabel}</span>
        </div>

        <div className="hairline--vertical" style={{ height: 12 }} />

        <div className="flex items-center gap-1.5">
          <span className="mono-label mono-label--tight">Zoom</span>
          <span
            className="text-[11px] tab-num"
            style={{ color: 'var(--text-primary)' }}
          >
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
    </footer>
  );
}

function formatAgo(ts: number): string {
  const sec = Math.round((Date.now() - ts) / 1000);
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.round(min / 60)}h ago`;
}
