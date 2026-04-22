import { useCanvasStore } from '@/store/canvasStore';
import { resolveDrillChain } from '@/utils/sectionTree';
import { House, CaretRight, ArrowUUpLeft } from '@phosphor-icons/react';

export function Breadcrumb() {
  const venueData = useCanvasStore((s) => s.venueData);
  const drillPath = useCanvasStore((s) => s.drillPath);
  const drillToRoot = useCanvasStore((s) => s.drillToRoot);
  const drillUp = useCanvasStore((s) => s.drillUp);

  if (!drillPath.length) return null;

  const chain = resolveDrillChain(venueData, drillPath);

  return (
    <nav
      aria-label="Breadcrumb"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-20"
    >
      <div
        className="flex items-center gap-1 px-1.5 py-1 rounded-pill backdrop-blur-[6px]"
        style={{
          background: 'rgba(23, 23, 23, 0.84)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <button
          onClick={drillToRoot}
          className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 h-6 rounded-pill transition-colors duration-base ease-soft-spring hover:bg-[var(--bg-panel-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          style={{ color: 'var(--text-primary)' }}
          title="Return to root"
        >
          <House size={12} weight="fill" style={{ color: 'var(--accent)' }} />
          <span>{venueData.venue.name}</span>
        </button>

        {chain.map((s, i) => {
          const active = i === chain.length - 1;
          return (
            <div key={s.id} className="flex items-center gap-0.5">
              <CaretRight
                size={10}
                style={{ color: 'var(--text-faint)' }}
                className="mx-0.5"
              />
              <span
                className="text-[12px] font-medium px-2.5 h-6 inline-flex items-center rounded-pill transition-colors"
                style={
                  active
                    ? {
                        background: 'var(--bg-panel-raised)',
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-primary)',
                      }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {s.name}
              </span>
            </div>
          );
        })}

        <span
          aria-hidden
          className="mx-1 h-4 w-px"
          style={{ background: 'var(--border)' }}
        />

        <button
          onClick={drillUp}
          className="flex items-center gap-1 text-[11px] font-medium px-2 h-6 rounded-pill transition-colors duration-base ease-soft-spring hover:bg-[var(--bg-panel-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          style={{ color: 'var(--text-secondary)' }}
          title="Up one level (Esc)"
        >
          <ArrowUUpLeft size={12} />
          <span>Up</span>
          <kbd
            className="mono-label mono-label--tight px-1 h-4 rounded-sm inline-flex items-center"
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            esc
          </kbd>
        </button>
      </div>
    </nav>
  );
}
