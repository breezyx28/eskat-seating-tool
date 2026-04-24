import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SeatMapRuntime from '@/export/SeatMapRuntime';
import {
  buildBenchmarkVenue,
  type BenchmarkLayout,
} from '@/utils/benchmarkVenue';
import type { VenueData } from '@/types';

type SweepStatus = 'idle' | 'building' | 'mounting' | 'measuring' | 'done';

type RenderMode = 'canvas' | 'dom';

interface SweepRow {
  seatCount: number;
  layout: BenchmarkLayout;
  mountMs: number;
  /** Render mode at fit zoom (usually canvas at high seat counts). */
  fitMode: RenderMode;
  /** FPS sampled at fit zoom (canvas mode for 1k+ seats). */
  fpsAvgFit: number;
  fpsMinFit: number;
  /** FPS sampled after programmatically zooming in past the DOM threshold. */
  fpsAvgZoomed: number;
  fpsMinZoomed: number;
  /** Render mode observed after zoom-in (should be 'dom'). */
  zoomedMode: RenderMode;
  domNodes: number;
  heapMb: number | null;
  timestamp: number;
}

const SWEEP_STEPS = [1000, 2500, 5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];

function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  return ms < 10 ? `${ms.toFixed(2)} ms` : `${ms.toFixed(0)} ms`;
}

function formatHeap(bytes: number | null): string {
  if (bytes == null) return '—';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getHeap(): number | null {
  // Chromium-only, non-standard but useful for benchmarks.
  const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
  return perf.memory?.usedJSHeapSize ?? null;
}

/**
 * Fires `onReady(elapsedMs)` once the surrounding DOM has finished committing
 * and the first animation frame after commit has ticked. Remounts on `token`
 * change so each benchmark iteration gets a fresh measurement.
 */
function MountTimer({
  token,
  onReady,
}: {
  token: number;
  onReady: (ms: number) => void;
}) {
  const startRef = useRef(performance.now());
  useLayoutEffect(() => {
    startRef.current = performance.now();
  }, [token]);
  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      onReady(performance.now() - startRef.current);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [token, onReady]);
  return null;
}

export default function Benchmark() {
  const [seatCountInput, setSeatCountInput] = useState(5000);
  const [layout, setLayout] = useState<BenchmarkLayout>('single-grid');
  const [venueData, setVenueData] = useState<VenueData>(() =>
    buildBenchmarkVenue({ seatCount: 5000, layout: 'single-grid' })
  );
  const [mounted, setMounted] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  // Stats.
  const [mountMs, setMountMs] = useState(0);
  const [fpsAvg, setFpsAvg] = useState(0);
  const [fpsMin, setFpsMin] = useState(0);
  const [domNodes, setDomNodes] = useState(0);
  const [heapBytes, setHeapBytes] = useState<number | null>(getHeap());
  const [clickMs, setClickMs] = useState<number | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [sweepStatus, setSweepStatus] = useState<SweepStatus>('idle');
  const [sweepResults, setSweepResults] = useState<SweepRow[]>([]);
  const [sweepProgress, setSweepProgress] = useState(0);
  const [renderMode, setRenderMode] = useState<RenderMode>('canvas');
  const [seatPx, setSeatPx] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);

  const readRuntimeMode = useCallback((): { mode: RenderMode; seatPx: number } => {
    const host = viewportRef.current?.querySelector('[data-render-mode]') as HTMLElement | null;
    if (!host) return { mode: 'canvas', seatPx: 0 };
    const mode = (host.dataset.renderMode as RenderMode) || 'canvas';
    const sp = Number(host.dataset.seatPx) || 0;
    return { mode, seatPx: sp };
  }, []);

  // ─── Mount time bridge (for auto sweep) ─────────────────────────
  const mountResolverRef = useRef<((ms: number) => void) | null>(null);
  const handleMountReady = useCallback((ms: number) => {
    setMountMs(ms);
    setDomNodes(viewportRef.current?.querySelectorAll('*').length ?? 0);
    setHeapBytes(getHeap());
    const resolver = mountResolverRef.current;
    if (resolver) {
      mountResolverRef.current = null;
      resolver(ms);
    }
  }, []);
  const waitForNextMount = useCallback(
    (timeoutMs = 10000) =>
      new Promise<number>((resolve, reject) => {
        const timer = window.setTimeout(() => {
          mountResolverRef.current = null;
          reject(new Error('mount timeout'));
        }, timeoutMs);
        mountResolverRef.current = (ms: number) => {
          window.clearTimeout(timer);
          resolve(ms);
        };
      }),
    []
  );

  // ─── FPS meter (rolling) ───────────────────────────────────────
  const fpsSamplesRef = useRef<number[]>([]);
  const currentFpsRef = useRef(60);
  const currentFpsMinRef = useRef(60);
  useEffect(() => {
    let raf = 0;
    let lastStamp = performance.now();
    const windowMs = 1000;
    const frames: number[] = [];
    const tick = (now: number) => {
      const delta = now - lastStamp;
      lastStamp = now;
      frames.push(delta);
      // Trim to last ~windowMs worth of frames.
      let sum = 0;
      for (let i = frames.length - 1; i >= 0; i--) {
        sum += frames[i];
        if (sum > windowMs) {
          frames.splice(0, i);
          break;
        }
      }
      if (frames.length > 2) {
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
        const worst = Math.max(...frames);
        const avgFps = 1000 / avg;
        const minFps = 1000 / worst;
        currentFpsRef.current = avgFps;
        currentFpsMinRef.current = minFps;
        fpsSamplesRef.current.push(avgFps);
        if (fpsSamplesRef.current.length > 600) fpsSamplesRef.current.shift();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Push current FPS values to React state 4x/sec so the HUD updates.
  useEffect(() => {
    const id = window.setInterval(() => {
      setFpsAvg(currentFpsRef.current);
      setFpsMin(currentFpsMinRef.current);
      setHeapBytes(getHeap());
      if (viewportRef.current) {
        setDomNodes(viewportRef.current.querySelectorAll('*').length);
      }
      const { mode, seatPx: sp } = readRuntimeMode();
      setRenderMode(mode);
      setSeatPx(sp);
    }, 250);
    return () => window.clearInterval(id);
  }, [readRuntimeMode]);

  // ─── Click latency bridge ──────────────────────────────────────
  const clickStartRef = useRef<number | null>(null);
  const handlePointerDown = useCallback(() => {
    clickStartRef.current = performance.now();
  }, []);
  const handleSelectionChange = useCallback((ids: string[]) => {
    setSelectedCount(ids.length);
    if (clickStartRef.current != null) {
      setClickMs(performance.now() - clickStartRef.current);
      clickStartRef.current = null;
    }
  }, []);

  // ─── Regenerate venue ──────────────────────────────────────────
  const regenerate = useCallback(
    (count: number, layoutArg: BenchmarkLayout) => {
      setVenueData(buildBenchmarkVenue({ seatCount: count, layout: layoutArg }));
      setReloadToken((t) => t + 1);
      setSelectedCount(0);
      setClickMs(null);
    },
    []
  );

  // Forces the runtime into DOM mode by dispatching wheel events until the
  // reported `data-render-mode` switches to 'dom' or we hit the max zoom.
  const zoomIntoDomMode = useCallback(async () => {
    const host = viewportRef.current?.querySelector('[data-render-mode]') as
      | HTMLElement
      | null;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    for (let i = 0; i < 60; i++) {
      const { mode } = readRuntimeMode();
      if (mode === 'dom') return;
      host.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: -240,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          bubbles: true,
          cancelable: true,
        })
      );
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
  }, [readRuntimeMode]);

  // ─── Auto sweep ────────────────────────────────────────────────
  const sweepCancelRef = useRef(false);
  const runAutoSweep = useCallback(async () => {
    sweepCancelRef.current = false;
    setSweepResults([]);
    setSweepProgress(0);
    const current: SweepRow[] = [];
    const sampleFps = async (sampleMs: number) => {
      await new Promise((r) => window.setTimeout(r, 400));
      fpsSamplesRef.current = [];
      await new Promise((r) => window.setTimeout(r, sampleMs));
      const samples = fpsSamplesRef.current.slice();
      const avg =
        samples.length > 0 ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
      const min = samples.length > 0 ? Math.min(...samples) : 0;
      return { avg, min };
    };
    for (let i = 0; i < SWEEP_STEPS.length; i++) {
      if (sweepCancelRef.current) break;
      const step = SWEEP_STEPS[i];
      setSweepStatus('building');
      setSeatCountInput(step);
      regenerate(step, layout);
      setSweepStatus('mounting');
      let mountedMs = 0;
      try {
        mountedMs = await waitForNextMount();
      } catch {
        break;
      }
      if (sweepCancelRef.current) break;
      setSweepStatus('measuring');
      // 1) Measure at fit zoom (canvas mode for larger venues).
      const fit = await sampleFps(2000);
      const fitInfo = readRuntimeMode();
      if (sweepCancelRef.current) break;
      // 2) Zoom into DOM mode and measure again.
      await zoomIntoDomMode();
      const zoomedInfo = readRuntimeMode();
      const zoomed = await sampleFps(2000);
      if (sweepCancelRef.current) break;
      current.push({
        seatCount: step,
        layout,
        mountMs: mountedMs,
        fitMode: fitInfo.mode,
        fpsAvgFit: fit.avg,
        fpsMinFit: fit.min,
        fpsAvgZoomed: zoomed.avg,
        fpsMinZoomed: zoomed.min,
        zoomedMode: zoomedInfo.mode,
        domNodes: viewportRef.current?.querySelectorAll('*').length ?? 0,
        heapMb: getHeap(),
        timestamp: Date.now(),
      });
      setSweepResults([...current]);
      setSweepProgress(i + 1);
    }
    setSweepStatus('done');
  }, [layout, regenerate, waitForNextMount, readRuntimeMode, zoomIntoDomMode]);

  const cancelSweep = useCallback(() => {
    sweepCancelRef.current = true;
  }, []);

  // ─── CSV export ────────────────────────────────────────────────
  const copyCsv = useCallback(() => {
    if (!sweepResults.length) return;
    const lines = [
      'seats,layout,mount_ms,fit_mode,fps_avg_fit,fps_min_fit,zoomed_mode,fps_avg_zoomed,fps_min_zoomed,dom_nodes,heap_mb',
      ...sweepResults.map((r) =>
        [
          r.seatCount,
          r.layout,
          r.mountMs.toFixed(1),
          r.fitMode,
          r.fpsAvgFit.toFixed(1),
          r.fpsMinFit.toFixed(1),
          r.zoomedMode,
          r.fpsAvgZoomed.toFixed(1),
          r.fpsMinZoomed.toFixed(1),
          r.domNodes,
          r.heapMb != null ? (r.heapMb / (1024 * 1024)).toFixed(1) : '',
        ].join(',')
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
  }, [sweepResults]);

  // ─── Seats-rendered count (post-cull) ──────────────────────────
  const [seatsRendered, setSeatsRendered] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!viewportRef.current) return;
      setSeatsRendered(
        viewportRef.current.querySelectorAll('[data-seat-id]').length
      );
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const totalSeats = useMemo(() => {
    let n = 0;
    const walk = (list: VenueData['sections']) => {
      for (const s of list) {
        if (s.seats) n += s.seats.length;
        if (s.children) walk(s.children);
      }
    };
    walk(venueData.sections);
    return n;
  }, [venueData]);

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-[var(--bg-app)] text-[var(--text-primary)] p-4 lg:p-6 space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Exported SeatMap — Benchmark</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Stress-test the optimized runtime. This is the exact code shipped in the downloaded SeatMap.tsx.
          </p>
        </div>
        <a
          href="/playground"
          className="text-xs underline text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          ← Back to playground
        </a>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <aside className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-4">
          <div className="space-y-2">
            <Label className="text-xs">Seat count</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min={100}
                max={100000}
                step={500}
                value={seatCountInput}
                onChange={(e) => setSeatCountInput(Number(e.target.value) || 0)}
                className="h-8"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => regenerate(seatCountInput, layout)}
                disabled={sweepStatus === 'building' || sweepStatus === 'mounting'}
              >
                Apply
              </Button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {SWEEP_STEPS.map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => {
                    setSeatCountInput(n);
                    regenerate(n, layout);
                  }}
                >
                  {n >= 1000 ? `${n / 1000}k` : n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Layout</Label>
            <Select
              value={layout}
              onValueChange={(v) => {
                const next = v as BenchmarkLayout;
                setLayout(next);
                regenerate(seatCountInput, next);
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single-grid">Single grid</SelectItem>
                <SelectItem value="multi-section">3×3 sections</SelectItem>
                <SelectItem value="theatre-rows">Theatre rows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Controls</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setMounted((m) => !m)}
                className="flex-1"
              >
                {mounted ? 'Unmount' : 'Mount'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => regenerate(seatCountInput, layout)}
                className="flex-1"
              >
                Remount
              </Button>
            </div>
            {sweepStatus !== 'idle' && sweepStatus !== 'done' ? (
              <Button size="sm" variant="destructive" className="w-full" onClick={cancelSweep}>
                Cancel sweep ({sweepProgress}/{SWEEP_STEPS.length})
              </Button>
            ) : (
              <Button size="sm" variant="default" className="w-full" onClick={runAutoSweep}>
                Run auto sweep
              </Button>
            )}
            {sweepResults.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-[11px]"
                onClick={copyCsv}
              >
                Copy results as CSV
              </Button>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border)] space-y-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
            <div>
              <span className="inline-block w-20 text-[var(--text-primary)]">Click a seat</span>
              toggle select
            </div>
            <div>
              <span className="inline-block w-20 text-[var(--text-primary)]">Drag empty</span>
              marquee select
            </div>
            <div>
              <span className="inline-block w-20 text-[var(--text-primary)]">Scroll</span>
              zoom
            </div>
            <div>
              <span className="inline-block w-20 text-[var(--text-primary)]">Middle/Right drag</span>
              pan
            </div>
          </div>
        </aside>

        <div className="relative rounded-lg overflow-hidden border border-[var(--border)] bg-black min-h-[70vh]">
          {mounted ? (
            <div
              ref={viewportRef}
              className="absolute inset-0"
              onPointerDownCapture={handlePointerDown}
            >
              <SeatMapRuntime
                key={reloadToken}
                venueData={venueData}
                onSelectionChange={handleSelectionChange}
              />
              <MountTimer token={reloadToken} onReady={handleMountReady} />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)] text-sm">
              Component unmounted
            </div>
          )}

          {/* Live stats HUD */}
          <div className="absolute top-3 left-3 z-10 rounded-md bg-black/70 backdrop-blur border border-white/10 px-3 py-2 text-[11px] font-mono space-y-0.5 text-white pointer-events-none min-w-[240px]">
            <StatRow label="FPS" value={`${fpsAvg.toFixed(0)} (min ${fpsMin.toFixed(0)})`} emphasis={fpsAvg > 55 ? 'good' : fpsAvg > 30 ? 'warn' : 'bad'} />
            <StatRow label="Mode" value={renderMode.toUpperCase()} emphasis={renderMode === 'canvas' ? 'good' : undefined} />
            <StatRow label="Seat px" value={seatPx.toFixed(1)} />
            <StatRow label="Mount" value={formatMs(mountMs)} />
            <StatRow label="Click" value={clickMs != null ? formatMs(clickMs) : '—'} />
            <StatRow label="Seats (data)" value={totalSeats.toLocaleString()} />
            <StatRow label="Seats (rendered)" value={seatsRendered.toLocaleString()} />
            <StatRow label="DOM nodes" value={domNodes.toLocaleString()} />
            <StatRow label="Heap" value={formatHeap(heapBytes)} />
            <StatRow label="Selected" value={selectedCount.toString()} />
          </div>

          {sweepStatus !== 'idle' && sweepStatus !== 'done' && (
            <div className="absolute top-3 right-3 z-10 rounded-md bg-[var(--accent)]/90 px-3 py-1 text-[11px] font-semibold text-white">
              Sweep {sweepStatus} • {sweepProgress}/{SWEEP_STEPS.length}
            </div>
          )}
        </div>
      </section>

      {sweepResults.length > 0 && (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Sweep results</h2>
            <span className="text-[11px] text-[var(--text-muted)]">
              {sweepResults.length} step{sweepResults.length === 1 ? '' : 's'} • layout: {layout}
            </span>
          </div>
          <table className="w-full text-[12px] font-mono">
            <thead>
              <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                <th className="py-1 pr-3">Seats</th>
                <th className="py-1 pr-3">Mount</th>
                <th className="py-1 pr-3">Fit mode</th>
                <th className="py-1 pr-3">FPS (fit)</th>
                <th className="py-1 pr-3">Zoom mode</th>
                <th className="py-1 pr-3">FPS (zoomed)</th>
                <th className="py-1 pr-3">DOM</th>
                <th className="py-1 pr-3">Heap</th>
                <th className="py-1 pr-3">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {sweepResults.map((r) => {
                // Take the worse of fit and zoomed FPS as the verdict driver, since
                // the user will likely hit both modes during normal interaction.
                const worstFps = Math.min(r.fpsAvgFit || 60, r.fpsAvgZoomed || 60);
                const verdict =
                  worstFps > 55 ? 'smooth' : worstFps > 30 ? 'usable' : 'laggy';
                return (
                  <tr key={r.timestamp + r.seatCount} className="border-b border-[var(--border)]/40">
                    <td className="py-1 pr-3">{r.seatCount.toLocaleString()}</td>
                    <td className="py-1 pr-3">{formatMs(r.mountMs)}</td>
                    <td className="py-1 pr-3 uppercase text-[10px] tracking-wider">{r.fitMode}</td>
                    <td className="py-1 pr-3">{r.fpsAvgFit.toFixed(1)} / {r.fpsMinFit.toFixed(1)}</td>
                    <td className="py-1 pr-3 uppercase text-[10px] tracking-wider">{r.zoomedMode}</td>
                    <td className="py-1 pr-3">{r.fpsAvgZoomed.toFixed(1)} / {r.fpsMinZoomed.toFixed(1)}</td>
                    <td className="py-1 pr-3">{r.domNodes.toLocaleString()}</td>
                    <td className="py-1 pr-3">{formatHeap(r.heapMb)}</td>
                    <td className="py-1 pr-3">
                      <VerdictBadge verdict={verdict} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: 'good' | 'warn' | 'bad';
}) {
  const color =
    emphasis === 'good'
      ? '#34d399'
      : emphasis === 'warn'
        ? '#fbbf24'
        : emphasis === 'bad'
          ? '#f87171'
          : 'rgba(255,255,255,0.9)';
  return (
    <div className="flex justify-between gap-4">
      <span className="opacity-60">{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: 'smooth' | 'usable' | 'laggy' }) {
  const color =
    verdict === 'smooth' ? '#34d399' : verdict === 'usable' ? '#fbbf24' : '#f87171';
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {verdict}
    </span>
  );
}
