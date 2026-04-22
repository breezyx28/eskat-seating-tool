import type { ReactNode } from 'react';

interface Shortcut {
  keys: string[];
  label: string;
  desc: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Ctrl', 'N'], label: 'New canvas', desc: 'Fresh venue, same zoom.' },
  { keys: ['Ctrl', 'S'], label: 'Save JSON', desc: 'Download current layout.' },
  { keys: ['Ctrl', 'O'], label: 'Open JSON', desc: 'Load a saved venue file.' },
  { keys: ['Ctrl', 'E'], label: 'Export .tsx', desc: 'One-file React component.' },
  { keys: ['Ctrl', 'Z'], label: 'Undo', desc: '50-step history.' },
  { keys: ['Ctrl', 'A'], label: 'Select all', desc: 'Every section in view.' },
  { keys: ['Ctrl', 'L'], label: 'Lock canvas', desc: 'Freeze every interaction.' },
  { keys: ['Esc'], label: 'Drill up / deselect', desc: 'Context-aware escape.' },
];

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      className="mono-label mono-label--tight inline-flex h-5 items-center rounded-sm px-1.5"
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
        fontSize: '10px',
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </kbd>
  );
}

export function ShortcutGrid() {
  return (
    <section
      className="relative"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:py-28">
        <div className="mb-12 flex flex-col gap-4 md:max-w-[640px]">
          <span className="mono-label">Shortcuts</span>
          <h2
            className="display-heading"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '-0.03em',
              textWrap: 'balance',
            }}
          >
            Built for the keyboard.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg md:grid-cols-2 lg:grid-cols-4"
          style={{ background: 'var(--border)', border: '1px solid var(--border)' }}
        >
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-3 p-5"
              style={{ background: 'var(--bg-panel-raised)' }}
            >
              <div className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={k} className="flex items-center gap-1">
                    <Kbd>{k}</Kbd>
                    {i < s.keys.length - 1 && (
                      <span
                        className="mono-label"
                        style={{
                          color: 'var(--text-muted)',
                          fontSize: '10px',
                        }}
                      >
                        +
                      </span>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-1">
                <span
                  className="text-[13px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {s.label}
                </span>
                <span
                  className="text-[12px] leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {s.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
