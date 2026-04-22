import { useEffect, useMemo, useState } from 'react';
import type { VenueData } from '@/types';
import { exportAsReactComponent } from '@/utils/exportComponent';
import { TEMPLATE_SHOWCASE } from '@/components/previews/TemplatePreviews';
import { TemplateDemoPreview, type DemoSeatShape } from './TemplateDemoPreview';
import { CodePane } from './CodePane';

const SHAPE_OPTIONS: { id: DemoSeatShape; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'square', label: 'Square' },
  { id: 'chair', label: 'Chair' },
  { id: 'chair-simple', label: 'Seat' },
];

type TemplateId = (typeof TEMPLATE_SHOWCASE)[number]['id'];
type MainTab = 'preview' | 'code';
type CodeTab = 'component' | 'usage';

// Lazy loaders mirror TemplatesTab — the JSONs are heavy (cinema is ~9MB),
// so we only fetch them when a visitor actually clicks that tab.
const TEMPLATE_LOADERS: Record<TemplateId, () => Promise<VenueData>> = {
  concert: () => import('@/templates/concert.json').then((m) => m.default as VenueData),
  stadium: () => import('@/templates/stadium.json').then((m) => m.default as VenueData),
  theatre: () => import('@/templates/theatre.json').then((m) => m.default as VenueData),
  arena: () => import('@/templates/arena.json').then((m) => m.default as VenueData),
  cinema: () => import('@/templates/cinema-complex.json').then((m) => m.default as VenueData),
};

function pascalCase(id: TemplateId): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function componentNameFor(id: TemplateId): string {
  return `${pascalCase(id)}SeatMap`;
}

function fileNameFor(id: TemplateId): string {
  return `${componentNameFor(id)}.tsx`;
}

function usageSnippetFor(id: TemplateId): string {
  const name = componentNameFor(id);
  return `import { ${name} } from './${name}';

export default function CheckoutPage() {
  return (
    <${name}
      maxSelectable={4}
      onSeatSelect={(seatId, info) => {
        // Fired when a seat toggles on. "info" includes row, section and price.
        console.log('picked', seatId, info);
      }}
      onSelectionChange={(selectedIds) => {
        console.log('selection:', selectedIds);
      }}
    />
  );
}
`;
}

export function TemplateDemo() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>('theatre');
  const [activeTab, setActiveTab] = useState<MainTab>('preview');
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('component');
  const [cache, setCache] = useState<Partial<Record<TemplateId, VenueData>>>({});
  const [selectionByTemplate, setSelectionByTemplate] = useState<
    Partial<Record<TemplateId, Set<string>>>
  >({});
  const [loading, setLoading] = useState<TemplateId | null>(null);
  const [seatShape, setSeatShape] = useState<DemoSeatShape>('circle');
  const [rangeMode, setRangeMode] = useState(false);

  // Lazily fetch the active template on mount + on every tab switch. Cached
  // after first load so subsequent switches are instant.
  useEffect(() => {
    if (cache[activeTemplate]) return;
    let cancelled = false;
    setLoading(activeTemplate);
    TEMPLATE_LOADERS[activeTemplate]()
      .then((data) => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [activeTemplate]: data }));
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (cancelled) return;
        setLoading((cur) => (cur === activeTemplate ? null : cur));
      });
    return () => {
      cancelled = true;
    };
  }, [activeTemplate, cache]);

  const venue = cache[activeTemplate];
  const selectedSeatIds = selectionByTemplate[activeTemplate] ?? new Set<string>();

  const handleSelectionChange = (next: Set<string>) => {
    setSelectionByTemplate((prev) => ({ ...prev, [activeTemplate]: next }));
  };

  const resetSelection = () => {
    setSelectionByTemplate((prev) => ({
      ...prev,
      [activeTemplate]: new Set<string>(),
    }));
  };

  const componentSource = useMemo(() => {
    if (!venue) return '';
    return exportAsReactComponent(venue, componentNameFor(activeTemplate));
  }, [venue, activeTemplate]);

  const usageSource = useMemo(() => usageSnippetFor(activeTemplate), [activeTemplate]);

  return (
    <section
      id="demo"
      className="relative"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:py-28">
        {/* Section heading */}
        <div className="mb-10 flex flex-col gap-4 md:max-w-[640px]">
          <span className="mono-label">Live demo</span>
          <h2
            className="display-heading"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '-0.03em',
              textWrap: 'balance',
            }}
          >
            Drop-in, end-user ready.
          </h2>
          <p
            className="max-w-[54ch] text-[15px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            This is what ships into your checkout flow. Click seats the way a
            ticket buyer would, switch templates, and grab the component source
            — zero tweaks required.
          </p>
        </div>

        {/* Template picker */}
        <div
          className="mb-5 flex flex-wrap gap-1.5 rounded-pill p-1.5 w-fit"
          style={{
            background: 'var(--bg-panel-raised)',
            border: '1px solid var(--border)',
          }}
        >
          {TEMPLATE_SHOWCASE.map((tpl) => {
            const active = tpl.id === activeTemplate;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setActiveTemplate(tpl.id)}
                className="h-8 rounded-pill px-3.5 text-[12px] font-medium transition-[background-color,color,transform] duration-base ease-soft-spring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                style={{
                  background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {tpl.name}
                <span
                  className="ml-1.5 text-[10px] tab-num"
                  style={{
                    color: active
                      ? 'var(--accent)'
                      : 'var(--text-faint)',
                    opacity: 0.75,
                  }}
                >
                  {tpl.meta}
                </span>
              </button>
            );
          })}
        </div>

        {/* Window chrome */}
        <div
          className="relative overflow-hidden rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.28)]"
          style={{
            background: 'var(--bg-panel-raised)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Header */}
          <div
            className="flex h-9 items-center justify-between px-3"
            style={{
              background: 'var(--bg-panel)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-[10px] w-[10px] rounded-full"
                style={{ background: '#ff5f57', opacity: 0.7 }}
              />
              <span
                className="h-[10px] w-[10px] rounded-full"
                style={{ background: '#febc2e', opacity: 0.7 }}
              />
              <span
                className="h-[10px] w-[10px] rounded-full"
                style={{ background: '#28c840', opacity: 0.7 }}
              />
            </div>

            <div
              className="hidden text-[11px] md:block"
              style={{
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono, ui-monospace, Menlo, monospace)',
              }}
            >
              {fileNameFor(activeTemplate)}
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'preview' && (
                <div
                  className="hidden sm:flex items-center gap-0.5 rounded-pill p-0.5"
                  style={{
                    background: 'var(--bg-canvas)',
                    border: '1px solid var(--border)',
                  }}
                  role="radiogroup"
                  aria-label="Seat shape"
                >
                  {SHAPE_OPTIONS.map((opt) => (
                    <ShapeButton
                      key={opt.id}
                      shape={opt.id}
                      label={opt.label}
                      active={seatShape === opt.id}
                      onClick={() => setSeatShape(opt.id)}
                    />
                  ))}
                </div>
              )}

              <div
                className="flex items-center gap-0.5 rounded-pill p-0.5"
                style={{
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border)',
                }}
              >
                <HeaderTab
                  active={activeTab === 'preview'}
                  onClick={() => setActiveTab('preview')}
                  label="Preview"
                />
                <HeaderTab
                  active={activeTab === 'code'}
                  onClick={() => setActiveTab('code')}
                  label="Code"
                />
              </div>
            </div>
          </div>

          {/* Body — responsive aspect-ratio box keeps the window the same
              size across Preview/Code tabs and every template, while still
              scaling with the landing card's width. */}
          <div
            className="relative w-full"
            style={{ aspectRatio: '16 / 9', minHeight: 280 }}
          >
            {activeTab === 'preview' ? (
              <div className="absolute inset-0">
                {venue ? (
                  <TemplateDemoPreview
                    venue={venue}
                    selectedSeatIds={selectedSeatIds}
                    onSelectionChange={handleSelectionChange}
                    onReset={resetSelection}
                    shape={seatShape}
                    rangeMode={rangeMode}
                    onToggleRangeMode={() => setRangeMode((v) => !v)}
                  />
                ) : (
                  <LoadingPane
                    label={
                      loading
                        ? `Loading ${pascalCase(activeTemplate)} template…`
                        : 'Preparing preview…'
                    }
                  />
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col">
                {/* Code sub-tabs */}
                <div
                  className="flex items-center gap-4 px-4 pt-2.5 pb-0 flex-none"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <SubTab
                    active={activeCodeTab === 'component'}
                    onClick={() => setActiveCodeTab('component')}
                    label="Component"
                    hint={fileNameFor(activeTemplate)}
                  />
                  <SubTab
                    active={activeCodeTab === 'usage'}
                    onClick={() => setActiveCodeTab('usage')}
                    label="Usage"
                    hint="CheckoutPage.tsx"
                  />
                </div>

                <div className="flex-1 min-h-0">
                  {activeCodeTab === 'component' ? (
                    venue ? (
                      <CodePane code={componentSource} />
                    ) : (
                      <LoadingPane
                        label={
                          loading
                            ? `Generating ${componentNameFor(activeTemplate)}.tsx…`
                            : 'Preparing component source…'
                        }
                      />
                    )
                  ) : (
                    <CodePane code={usageSource} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <p
          className="mt-4 max-w-[64ch] text-[13px] leading-relaxed"
          style={{ color: 'var(--text-muted)' }}
        >
          Copy either file, drop it into your app, and you're shipping a
          themed, interactive seat picker — no runtime dependencies, no
          design-tool integration.
        </p>
      </div>
    </section>
  );
}

/* ─── Sub-components ────────────────────────────────────────────── */

function ShapeButton({
  shape,
  label,
  active,
  onClick,
}: {
  shape: DemoSeatShape;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  // Mini-glyph preview — drawn in a 14x14 SVG so the segmented control reads
  // at a glance and matches what the preview renders.
  const color = active ? 'var(--accent)' : 'var(--text-secondary)';
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`Shape: ${label}`}
      title={label}
      onClick={onClick}
      className="h-6 w-6 rounded-pill flex items-center justify-center transition-[background-color,color] duration-base ease-soft-spring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      style={{
        background: active ? 'var(--accent-soft)' : 'transparent',
        color,
      }}
    >
      <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden>
        {shape === 'circle' && <circle cx={7} cy={7} r={4.5} fill={color} />}
        {shape === 'rounded' && (
          <rect x={2.5} y={2.5} width={9} height={9} rx={2} fill={color} />
        )}
        {shape === 'square' && (
          <rect x={2.5} y={2.5} width={9} height={9} fill={color} />
        )}
        {shape === 'chair' && (
          <g fill={color}>
            <rect x={3} y={1.5} width={8} height={2.5} rx={1} />
            <rect x={3.5} y={5} width={7} height={5} rx={1} />
            <rect x={2} y={4.5} width={2} height={5.5} rx={0.8} opacity={0.8} />
            <rect x={10} y={4.5} width={2} height={5.5} rx={0.8} opacity={0.8} />
          </g>
        )}
        {shape === 'chair-simple' && (
          <g fill={color}>
            <rect x={2.5} y={2} width={9} height={8} rx={1.8} />
            <rect x={2.5} y={10} width={2.5} height={2.5} rx={0.6} opacity={0.7} />
            <rect x={9} y={10} width={2.5} height={2.5} rx={0.6} opacity={0.7} />
          </g>
        )}
      </svg>
    </button>
  );
}

function HeaderTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-6 rounded-pill px-3 text-[11px] font-medium transition-[background-color,color] duration-base ease-soft-spring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      style={{
        background: active ? 'var(--accent-soft)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  );
}

function SubTab({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex items-center gap-2 pb-2 text-[11px] font-medium transition-colors duration-base ease-soft-spring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      style={{
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      }}
    >
      <span className="mono-label mono-label--tight">{label}</span>
      <span
        className="text-[10px]"
        style={{
          color: active ? 'var(--text-secondary)' : 'var(--text-faint)',
          fontFamily: 'var(--font-mono, ui-monospace, Menlo, monospace)',
        }}
      >
        {hint}
      </span>
      {active && (
        <span
          className="absolute inset-x-0 -bottom-px h-[2px] rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      )}
    </button>
  );
}

function LoadingPane({ label }: { label: string }) {
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: 'var(--bg-canvas)' }}
    >
      <div className="flex items-center gap-3">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-transparent"
          style={{
            borderTopColor: 'var(--accent)',
            borderRightColor: 'var(--accent)',
            borderBottomColor: 'var(--border)',
            borderLeftColor: 'var(--border)',
          }}
        />
        <span
          className="text-[12px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
