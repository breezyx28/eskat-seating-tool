import { Check } from '@phosphor-icons/react';

const BULLETS = [
  'Nested drill-in sections',
  'Stripe / checkerboard patterns',
  'Arcs & bezier-edited polygons',
  'Per-section custom seat icons',
  'venue.config.ts sidecar',
];

const USAGE_CODE = `import SeatMap from './SeatMap';

export default function App() {
  return (
    <div style={{ height: '100dvh' }}>
      <SeatMap
        maxSelectable={4}
        initialSeatStates={{ /* "seat-id": "reserved" */ }}
        onSelectionChange={(ids) => console.log('Selected:', ids)}
        onSeatSelect={(id, info) =>
          console.log(
            \`\${info.label} (\${info.sectionName}) — \${info.currency}\${info.price}\`
          )
        }
      />
    </div>
  );
}`;

export function ExportCallout() {
  return (
    <section
      id="export"
      className="relative"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-10 px-6 py-20 md:grid-cols-[5fr_7fr] md:py-28">
        <div className="flex flex-col gap-5">
          <span className="mono-label">Export</span>
          <h2
            className="display-heading"
            style={{
              fontSize: 'clamp(2rem, 3.6vw, 2.75rem)',
              letterSpacing: '-0.03em',
              textWrap: 'balance',
            }}
          >
            One drop-in file. Zero dependencies.
          </h2>
          <p
            className="max-w-[52ch] text-[15px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Hit Export and you get a single <code>.tsx</code> that renders your entire
            venue — seat states, selection, zoom — with nothing in its bundle but the
            React you already ship.
          </p>

          <ul className="mt-2 flex flex-col gap-2.5">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent)',
                  }}
                >
                  <Check size={9} weight="bold" />
                </span>
                <span
                  className="text-[14px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {b}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="overflow-hidden rounded-lg"
          style={{
            background: 'var(--bg-panel-raised)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Mock window chrome */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="mono-label"
                style={{ color: 'var(--text-secondary)' }}
              >
                SeatMap.tsx
              </span>
            </div>
            <span
              className="mono-label tab-num"
              style={{ color: 'var(--text-muted)' }}
            >
              0 deps · 1 file
            </span>
          </div>

          <pre
            className="overflow-x-auto p-5 text-[11.5px] leading-[1.7]"
            style={{
              fontFamily:
                "'Geist Mono', 'JetBrains Mono', 'Source Code Pro', ui-monospace, monospace",
              background: 'var(--bg-canvas)',
              color: 'var(--text-primary)',
            }}
          >
            <code>{USAGE_CODE}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
