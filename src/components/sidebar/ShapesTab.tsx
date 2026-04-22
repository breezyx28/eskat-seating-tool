import type { SectionShape } from '@/types';
import { Rectangle, Circle, Polygon, Wall, MoonStars } from '@phosphor-icons/react';

export interface ShapeDescriptor {
  type: SectionShape;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export const SHAPES: ShapeDescriptor[] = [
  {
    type: 'rectangle',
    label: 'Rectangle',
    icon: <Rectangle size={18} weight="regular" />,
    description: 'Straight section',
  },
  {
    type: 'circle',
    label: 'Circle',
    icon: <Circle size={18} weight="regular" />,
    description: 'Round section',
  },
  {
    type: 'ellipse',
    label: 'Ellipse',
    icon: <Circle size={18} weight="regular" style={{ transform: 'scaleX(1.6)' }} />,
    description: 'Elongated oval',
  },
  {
    type: 'polygon',
    label: 'Polygon',
    icon: <Polygon size={18} weight="regular" />,
    description: 'Click to add points',
  },
  {
    type: 'arc',
    label: 'Arc',
    icon: <MoonStars size={18} weight="regular" />,
    description: 'Curved theatre row',
  },
  {
    type: 'stage',
    label: 'Stage',
    icon: <Wall size={18} weight="regular" />,
    description: 'Non-seat label',
  },
];

interface ShapesTabProps {
  onStartPolygon: () => void;
  polygonActive: boolean;
}

export function ShapesTab({ onStartPolygon, polygonActive }: ShapesTabProps) {
  const handleDragStart = (e: React.DragEvent, shape: ShapeDescriptor) => {
    e.dataTransfer.setData('application/x-eskat-shape', shape.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="p-4 space-y-5">
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <span className="mono-label">Primitives</span>
          <span
            className="text-[10px] tab-num"
            style={{ color: 'var(--text-faint)' }}
          >
            {SHAPES.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SHAPES.map((shape) => {
            const isPolygon = shape.type === 'polygon';
            const isActive = isPolygon && polygonActive;
            return (
              <button
                key={shape.type}
                draggable={!isPolygon}
                onDragStart={(e) => handleDragStart(e, shape)}
                onClick={() => {
                  if (isPolygon) onStartPolygon();
                }}
                className="group flex flex-col items-start gap-2 p-3 rounded-md text-left transition-[background-color,border-color,transform] duration-base ease-soft-spring hover:border-[var(--border-strong)] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]"
                style={{
                  background: isActive ? 'var(--accent-soft)' : 'var(--bg-panel-raised)',
                  border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                  cursor: isPolygon ? 'pointer' : 'grab',
                }}
                title={shape.description}
                aria-pressed={isActive}
              >
                <span
                  className="inline-flex h-7 w-7 items-center justify-center rounded-sm"
                  style={{
                    background: isActive ? 'var(--bg-panel)' : 'var(--bg-panel)',
                    border: `1px solid ${isActive ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {shape.icon}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-medium">{shape.label}</span>
                  <span
                    className="text-[10.5px] leading-tight"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {shape.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="hairline" />

      <section>
        <div className="mono-label mb-2">Hint</div>
        <p
          className="text-[11.5px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {polygonActive ? (
            <>
              Click on the canvas to add points. Press{' '}
              <Kbd>Enter</Kbd> or double-click to finish. <Kbd>Esc</Kbd> to
              cancel.
            </>
          ) : (
            <>Drag any shape onto the canvas to place it.</>
          )}
        </p>
      </section>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="mono-label mono-label--tight px-1 h-4 inline-flex items-center rounded-sm"
      style={{
        background: 'var(--bg-panel-raised)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </kbd>
  );
}
