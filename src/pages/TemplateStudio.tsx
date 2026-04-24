import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Copy,
  CursorClick,
  DownloadSimple,
  SpinnerGap,
} from '@phosphor-icons/react';
import { BrandLogo } from '@/assets/icons/BrandLogo';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import SeatMapRuntime from '@/export/SeatMapRuntime';
import { TEMPLATE_SHOWCASE } from '@/components/previews/TemplatePreviews';
import { ControlPanel } from '@/components/templateStudio/ControlPanel';
import type { VenueData } from '@/types';
import {
  DEFAULT_OVERRIDES,
  countSeats,
  deriveVenueData,
  seatCountToDensity,
  type GlobalOverride,
  type Overrides,
  type SectionOverride,
} from '@/utils/templateOverrides';
import {
  downloadReactComponent,
  exportAsReactComponent,
} from '@/utils/exportComponent';
import { highlightTsx } from '@/utils/highlightTsx';

type TemplateId = (typeof TEMPLATE_SHOWCASE)[number]['id'];

const TEMPLATE_LOADERS: Record<TemplateId, () => Promise<VenueData>> = {
  concert: () => import('@/templates/concert.json').then((m) => m.default as VenueData),
  stadium: () => import('@/templates/stadium.json').then((m) => m.default as VenueData),
  theatre: () => import('@/templates/theatre.json').then((m) => m.default as VenueData),
  arena: () => import('@/templates/arena.json').then((m) => m.default as VenueData),
  cinema: () => import('@/templates/cinema-complex.json').then((m) => m.default as VenueData),
};

/**
 * Sensible starting seat count per template so the runtime doesn't try to
 * render 18k seats at once on a casual visit. Users can raise the count up
 * to the template's base total after it has loaded.
 */
const DEFAULT_SEAT_COUNT: Record<TemplateId, number> = {
  theatre: 800,
  concert: 700,
  arena: 700,
  stadium: 1000,
  cinema: 900,
};

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '').replace(/^[0-9]+/, '');
  if (!cleaned) return 'SeatMap';
  return cleaned[0].toUpperCase() + cleaned.slice(1);
}

export default function TemplateStudio() {
  // `null` on first mount — we do not auto-load any template. The user picks.
  const [selectedId, setSelectedId] = useState<TemplateId | null>(null);
  const [baseVenue, setBaseVenue] = useState<VenueData | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [edits, setEdits] = useState<Overrides>(DEFAULT_OVERRIDES);
  const [componentName, setComponentName] = useState('SeatMap');

  // Debounced density so dragging the slider doesn't thrash the derive pass
  // on large templates (e.g. Stadium at 18k seats).
  const densityRaw = edits.density;
  const [densityDebounced, setDensityDebounced] = useState(densityRaw);
  useEffect(() => {
    const t = window.setTimeout(() => setDensityDebounced(densityRaw), 120);
    return () => window.clearTimeout(t);
  }, [densityRaw]);

  // Cancellation token for in-flight loads. If the user rapid-switches, only
  // the last-clicked template gets to set state.
  const loadTokenRef = useRef(0);

  const pickTemplate = useCallback((id: TemplateId) => {
    const myToken = ++loadTokenRef.current;

    // Immediately unmount the old venue so the previous SeatMapRuntime tears
    // down its canvases and spatial grid before we load a new one.
    setBaseVenue(null);
    setSelectedId(id);
    setLoadingTemplate(true);
    // Reset overrides up front; density gets a real value once the data
    // arrives and we know the template's base seat count.
    setEdits({ ...DEFAULT_OVERRIDES, density: 1 });
    setDensityDebounced(1);

    TEMPLATE_LOADERS[id]()
      .then((data) => {
        if (loadTokenRef.current !== myToken) return;
        setBaseVenue(data);
        const baseTotal = countSeats(data.sections);
        const target = Math.min(DEFAULT_SEAT_COUNT[id] ?? baseTotal, baseTotal);
        const startingDensity = seatCountToDensity(target, baseTotal);
        setEdits({ ...DEFAULT_OVERRIDES, density: startingDensity });
        setDensityDebounced(startingDensity);
      })
      .catch((err) => {
        if (loadTokenRef.current !== myToken) return;
        console.error(err);
        toast.error(`Failed to load ${id} template`);
      })
      .finally(() => {
        if (loadTokenRef.current !== myToken) return;
        setLoadingTemplate(false);
      });
  }, []);

  const derivedEdits = useMemo<Overrides>(
    () => ({ ...edits, density: densityDebounced }),
    [edits, densityDebounced]
  );

  const derived = useMemo<VenueData | null>(() => {
    if (!baseVenue) return null;
    return deriveVenueData(baseVenue, derivedEdits);
  }, [baseVenue, derivedEdits]);

  const totalSeatsBase = useMemo(
    () => (baseVenue ? countSeats(baseVenue.sections) : 0),
    [baseVenue]
  );
  const totalSeatsDerived = useMemo(
    () => (derived ? countSeats(derived.sections) : 0),
    [derived]
  );

  const source = useMemo(() => {
    if (!derived) return '';
    return exportAsReactComponent(derived, sanitizeName(componentName));
  }, [derived, componentName]);

  const sizeKb = useMemo(
    () => (new Blob([source]).size / 1024).toFixed(1),
    [source]
  );

  const handleGlobalChange = useCallback((patch: Partial<GlobalOverride>) => {
    setEdits((prev) => ({
      ...prev,
      global: { ...prev.global, ...patch },
    }));
  }, []);

  const handleSectionChange = useCallback(
    (sectionId: string, patch: Partial<SectionOverride>) => {
      setEdits((prev) => {
        const current = prev.sections[sectionId] ?? {};
        const next: SectionOverride = { ...current, ...patch };
        (Object.keys(next) as (keyof SectionOverride)[]).forEach((k) => {
          if (next[k] === undefined) delete next[k];
        });
        return { ...prev, sections: { ...prev.sections, [sectionId]: next } };
      });
    },
    []
  );

  const handleDensityChange = useCallback((density: number) => {
    setEdits((prev) => ({ ...prev, density }));
  }, []);

  const handleReset = useCallback(() => {
    let fallback = 1;
    if (selectedId && baseVenue) {
      const baseTotal = countSeats(baseVenue.sections);
      const target = Math.min(
        DEFAULT_SEAT_COUNT[selectedId] ?? baseTotal,
        baseTotal
      );
      fallback = seatCountToDensity(target, baseTotal);
    }
    setEdits({ ...DEFAULT_OVERRIDES, density: fallback });
    setDensityDebounced(fallback);
    toast.success('Overrides reset');
  }, [selectedId, baseVenue]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source);
      toast.success('Component source copied');
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  }, [source]);

  const handleDownload = useCallback(() => {
    if (!derived) return;
    downloadReactComponent(derived, sanitizeName(componentName));
    toast.success(`Downloaded ${sanitizeName(componentName)}.tsx`);
  }, [derived, componentName]);

  const derivedSections = derived?.sections ?? [];
  const hasSelection = selectedId !== null;

  return (
    <div
      className="h-screen overflow-y-auto overflow-x-hidden"
      style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}
    >
      <Header />

      <main className="mx-auto max-w-[1600px] px-4 md:px-6 py-5">
        <div className="mb-4">
          <h1
            className="text-[22px] md:text-[26px] font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Template studio
          </h1>
          <p
            className="text-[13px] mt-1 max-w-[62ch]"
            style={{ color: 'var(--text-muted)' }}
          >
            Start from a pre-built seat map, fine-tune colors, labels, prices
            and seat density, then copy or download the React component. No
            Playground required.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_360px] items-start">
          <TemplatePickerColumn
            selectedId={selectedId}
            onSelect={pickTemplate}
            loadingId={loadingTemplate ? selectedId : null}
          />

          <div className="flex flex-col gap-4 min-w-0">
            <PreviewPanel
              venue={derived}
              templateId={selectedId}
              loading={loadingTemplate}
              hasSelection={hasSelection}
            />

            <CodePanel
              source={source}
              componentName={sanitizeName(componentName)}
              sizeKb={sizeKb}
              sectionCount={derivedSections.length}
              seatCount={totalSeatsDerived}
              onCopy={handleCopy}
              onDownload={handleDownload}
              disabled={!derived}
            />
          </div>

          <aside
            className="rounded-lg border min-h-[560px] overflow-hidden flex flex-col"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-panel)',
            }}
          >
            {baseVenue ? (
              <ControlPanel
                sections={baseVenue.sections}
                edits={edits}
                onGlobalChange={handleGlobalChange}
                onSectionChange={handleSectionChange}
                onDensityChange={handleDensityChange}
                onReset={handleReset}
                componentName={componentName}
                onComponentNameChange={setComponentName}
                totalSeatsBase={totalSeatsBase}
                totalSeatsDerived={totalSeatsDerived}
              />
            ) : (
              <EmptyControlPanel
                loading={loadingTemplate}
                hasSelection={hasSelection}
              />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────

function Header() {
  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: 'rgba(23, 23, 23, 0.84)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-2 transition-opacity duration-base ease-soft-spring hover:opacity-80"
          >
            <BrandLogo size={22} style={{ color: 'var(--accent)' }} />
            <span
              className="mono-label truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              Eskat Seating
            </span>
          </Link>
          <span
            className="hidden md:inline mono-label"
            style={{ color: 'var(--text-faint)' }}
          >
            / templates
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft size={12} />
              Back to home
            </Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link to="/playground">Open playground</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ─── Template picker (left column) ───────────────────────────────

function TemplatePickerColumn({
  selectedId,
  onSelect,
  loadingId,
}: {
  selectedId: TemplateId | null;
  onSelect: (id: TemplateId) => void;
  loadingId: TemplateId | null;
}) {
  return (
    <aside
      className="rounded-lg border p-3 space-y-2"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-panel)',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="mono-label"
          style={{ color: 'var(--text-secondary)' }}
        >
          Templates
        </div>
        <span
          className="text-[10px] tab-num"
          style={{ color: 'var(--text-faint)' }}
        >
          {TEMPLATE_SHOWCASE.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {TEMPLATE_SHOWCASE.map((t) => {
          const selected = t.id === selectedId;
          const loading = loadingId === t.id;
          const Preview = t.Preview;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(t.id)}
              className="w-full rounded-md overflow-hidden text-left transition-[border-color,background-color,transform] duration-base ease-soft-spring active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              style={{
                background: selected
                  ? 'var(--bg-panel-active)'
                  : 'var(--bg-panel-raised)',
                border: `1px solid ${
                  selected ? 'var(--accent-border)' : 'var(--border)'
                }`,
              }}
            >
              <div
                className="h-20 flex items-center justify-center border-b"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Preview />
              </div>
              <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="text-[12.5px] font-medium tracking-tight truncate"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t.name}
                  </div>
                  <div
                    className="text-[10.5px] truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {loading ? 'Loading…' : t.meta}
                  </div>
                </div>
                {loading && (
                  <SpinnerGap
                    size={12}
                    className="animate-spin shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
      <p
        className="pt-1 text-[10.5px] leading-relaxed"
        style={{ color: 'var(--text-faint)' }}
      >
        Only the selected template is loaded into memory. Switching unmounts
        the previous canvas.
      </p>
    </aside>
  );
}

// ─── Live preview panel ─────────────────────────────────────────

function PreviewPanel({
  venue,
  templateId,
  loading,
  hasSelection,
}: {
  venue: VenueData | null;
  templateId: TemplateId | null;
  loading: boolean;
  hasSelection: boolean;
}) {
  // Watch container size. When the preview area resizes (e.g. sidebar
  // collapses at the md breakpoint, or the user resizes the window), nudge
  // SeatMapRuntime's built-in window-resize handler to re-run fitToViewport.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!venue) return;
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let pending = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(pending);
      ro.disconnect();
    };
  }, [venue]);

  // Whenever the derived venue identity changes (seat count, density,
  // colours, naming, etc.) re-run SeatMapRuntime's fit-to-viewport so the
  // (potentially resized) content stays centred. SeatMapRuntime listens for
  // window 'resize' to re-fit; piggy-back on that instead of widening its
  // public API. Skipping the very first render avoids a wasted fit since
  // SeatMapRuntime fits itself on mount.
  const firstFitSkipped = useRef(false);
  useEffect(() => {
    if (!venue) {
      firstFitSkipped.current = false;
      return;
    }
    if (!firstFitSkipped.current) {
      firstFitSkipped.current = true;
      return;
    }
    const id = requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
    return () => cancelAnimationFrame(id);
  }, [venue]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg border overflow-hidden w-full"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-panel)',
        height: 'clamp(440px, 65vh, 720px)',
      }}
    >
      {venue ? (
        // Remount the runtime whenever the template changes so its canvases
        // and spatial grid rebuild cleanly for the new geometry.
        <div className="w-full h-full">
          <SeatMapRuntime key={templateId ?? 'none'} venueData={venue} />
        </div>
      ) : (
        <EmptyPreviewHero loading={loading} hasSelection={hasSelection} />
      )}

      {loading && venue && (
        <div className="absolute top-3 right-3 z-10 rounded-md bg-black/70 backdrop-blur border border-white/10 px-2.5 py-1 text-[10.5px] font-mono text-white flex items-center gap-1.5">
          <SpinnerGap size={11} className="animate-spin" />
          Loading…
        </div>
      )}
    </div>
  );
}

function EmptyPreviewHero({
  loading,
  hasSelection,
}: {
  loading: boolean;
  hasSelection: boolean;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
      {loading ? (
        <>
          <SpinnerGap
            size={28}
            className="animate-spin"
            style={{ color: 'var(--accent)' }}
          />
          <div
            className="text-[13px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Loading template…
          </div>
        </>
      ) : (
        <>
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--bg-panel-raised)',
              border: '1px solid var(--border)',
            }}
          >
            <CursorClick
              size={18}
              weight="bold"
              style={{ color: 'var(--accent)' }}
            />
          </div>
          <div
            className="text-[14px] font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {hasSelection ? 'Preparing preview…' : 'Pick a template to begin'}
          </div>
          <p
            className="text-[12px] max-w-[42ch] leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            Choose one of the starter venues on the left. Only the selected
            template is loaded — everything else stays unmounted for
            performance.
          </p>
        </>
      )}
    </div>
  );
}

function EmptyControlPanel({
  loading,
  hasSelection,
}: {
  loading: boolean;
  hasSelection: boolean;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 text-center">
      <div
        className="mono-label"
        style={{ color: 'var(--text-secondary)' }}
      >
        Customize
      </div>
      <p
        className="text-[11.5px] max-w-[32ch] leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
      >
        {loading
          ? 'Loading template…'
          : hasSelection
            ? 'Preparing controls…'
            : 'Pick a template on the left to unlock colors, prices, icons and seat density.'}
      </p>
    </div>
  );
}

// ─── Code preview + copy + download ─────────────────────────────

function CodePanel({
  source,
  componentName,
  sizeKb,
  sectionCount,
  seatCount,
  onCopy,
  onDownload,
  disabled,
}: {
  source: string;
  componentName: string;
  sizeKb: string;
  sectionCount: number;
  seatCount: number;
  onCopy: () => void;
  onDownload: () => void;
  disabled: boolean;
}) {
  const highlightedRef = useRef<HTMLPreElement>(null);
  const highlighted = useMemo(() => highlightTsx(source), [source]);
  const lines = useMemo(() => source.split('\n').length, [source]);

  return (
    <section
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-panel)',
      }}
    >
      <header
        className="flex items-center justify-between gap-2 px-3 py-2 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="mono-label truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {componentName}.tsx
          </span>
          <span
            className="hairline--vertical h-3 shrink-0"
            aria-hidden
          />
          <span
            className="text-[11px] tab-num shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            {sizeKb} KB · {lines} lines · {sectionCount} sections ·{' '}
            {seatCount.toLocaleString()} seats
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="ghost" onClick={onCopy} disabled={disabled}>
            <Copy size={12} />
            Copy
          </Button>
          <Button size="sm" variant="brand" onClick={onDownload} disabled={disabled}>
            <DownloadSimple size={12} weight="bold" />
            Download .tsx
          </Button>
        </div>
      </header>

      <ScrollArea
        className="h-[320px] w-full"
        style={{ background: 'var(--bg-app)' }}
      >
        {disabled ? (
          <div className="h-[320px] flex items-center justify-center text-[12px] text-[var(--text-muted)]">
            Pick a template to generate the component source.
          </div>
        ) : (
          <pre
            ref={highlightedRef}
            className="p-4 text-[11px] leading-[1.7] font-mono whitespace-pre min-w-max"
            style={{ tabSize: 2 }}
          >
            <code>{highlighted}</code>
          </pre>
        )}
      </ScrollArea>
    </section>
  );
}
