/**
 * Pure helpers used by /templates (TemplateStudio) to derive a live `VenueData`
 * from an immutable base template + a small `Overrides` patch object.
 *
 * Guiding rules:
 *   1. Never mutate `base` — always return fresh top-level + fresh sections
 *      where something changed. Unchanged sections pass by reference so
 *      `SeatMapRuntime`'s spatial grid keeps its cached entries.
 *   2. `adjustSeatDensity` keeps every Nth seat and scales retained seat bounds
 *      so the visual footprint of each section stays roughly the same (the
 *      user explicitly asked for "size up chairs, don't touch template shape").
 *   3. Row-prefix: shift the alphabetic row cadence (e.g. A,B,C → M,N,O) rather
 *      than prepending, because pre-built templates use single-letter rowLabels.
 */

import type { Seat, Section, SeatIcon, VenueData } from '@/types';

/** Per-section user overrides. All fields optional. */
export interface SectionOverride {
  name?: string;
  price?: number;
  currency?: string;
  fill?: string;
  stroke?: string;
  /** Single letter A–Z (or AA, BB…) — first row starts at this letter. */
  rowStartLetter?: string;
  seatIcon?: SeatIcon;
}

/** Global overrides applied to every section unless a per-section value wins. */
export interface GlobalOverride {
  background?: string;
  seatIcon?: SeatIcon;
  currency?: string;
  /** Single letter; shifts the cadence of every section's rowLabels. */
  rowStartLetter?: string;
}

export interface Overrides {
  global: GlobalOverride;
  sections: Record<string, SectionOverride>;
  /** Fraction in (0, 1]. 1 = keep every seat. 0.25 = keep ~1/4. */
  density: number;
}

export const DEFAULT_OVERRIDES: Overrides = {
  global: {},
  sections: {},
  density: 1,
};

// ─── Public: derive a fresh VenueData ─────────────────────────────

/**
 * Returns a new `VenueData` reflecting `edits` on top of `base`. Idempotent and
 * pure — safe to call inside a `useMemo`.
 */
export function deriveVenueData(base: VenueData, edits: Overrides): VenueData {
  const sections = applyDensity(base.sections, edits.density);
  const patched = sections.map((s) =>
    applySectionTransforms(s, edits.sections[s.id], edits.global)
  );

  return {
    ...base,
    venue: {
      ...base.venue,
      background: edits.global.background ?? base.venue.background,
    },
    sections: patched,
  };
}

// ─── Density: subsample seats + rescale bounds ────────────────────

/**
 * Returns sections with `density` fraction of seats retained, scaled so the
 * section still "looks full". The sampling is row-aware: we group seats by
 * `rowLabel`, drop rows uniformly, and inside the surviving rows drop seats
 * uniformly. Each axis keeps `sqrt(density)` of its original count, so the
 * total reduction is `density` and the layout stays a regular 2D sub-grid
 * (no ragged starting offset between rows, equal gaps between neighbours).
 *
 * At `density >= ~1` the input is returned by reference (structural sharing).
 */
export function applyDensity(sections: Section[], density: number): Section[] {
  if (density >= 0.999) return sections;
  const d = clamp(density, 0.05, 1);
  // Per-axis keep ratio. For density 0.25 we keep half of each axis, so the
  // surviving 2D pattern has every other row + every other seat.
  const linearKeep = Math.sqrt(d);
  // sizeMult matches: each retained seat grows linearly by 1/sqrt(d) so the
  // visible footprint and seat-to-gap ratio are preserved.
  const sizeMult = 1 / linearKeep;

  return sections.map((section) => subsampleSection(section, linearKeep, sizeMult));
}

function subsampleSection(
  section: Section,
  linearKeep: number,
  sizeMult: number,
): Section {
  const N = section.seats.length;
  let newSeats: Seat[];
  if (N === 0) {
    newSeats = [];
  } else {
    // Group by rowLabel preserving original first-seen order so we don't
    // re-order rows that templates already laid out top-to-bottom.
    const rowOrder: string[] = [];
    const rowMap = new Map<string, Seat[]>();
    for (let i = 0; i < N; i++) {
      const seat = section.seats[i];
      const label = seat.rowLabel;
      let bucket = rowMap.get(label);
      if (!bucket) {
        bucket = [];
        rowMap.set(label, bucket);
        rowOrder.push(label);
      }
      bucket.push(seat);
    }

    // Sort each row by parsed seatNumber so columns line up consistently
    // even when the JSON happens to store seats in zig-zag order.
    for (let r = 0; r < rowOrder.length; r++) {
      const seats = rowMap.get(rowOrder[r])!;
      seats.sort((a, b) => {
        const ai = parseInt(a.seatNumber, 10);
        const bi = parseInt(b.seatNumber, 10);
        if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi;
        return a.seatNumber.localeCompare(b.seatNumber);
      });
    }

    // Pick rows uniformly. Always keep the row when there's only one.
    const rowCount = rowOrder.length;
    const targetRows =
      rowCount <= 1 ? rowCount : Math.max(1, Math.round(rowCount * linearKeep));
    const keptRowIdx = pickUniformIndices(rowCount, targetRows);

    newSeats = [];
    for (let i = 0; i < keptRowIdx.length; i++) {
      const row = rowMap.get(rowOrder[keptRowIdx[i]])!;
      const targetCols =
        row.length <= 1 ? row.length : Math.max(1, Math.round(row.length * linearKeep));
      const keptColIdx = pickUniformIndices(row.length, targetCols);
      for (let j = 0; j < keptColIdx.length; j++) {
        const s = row[keptColIdx[j]];
        // Expand around seat centre so scaling doesn't shift it off the grid.
        const cx = s.bounds.x + s.bounds.width / 2;
        const cy = s.bounds.y + s.bounds.height / 2;
        const w = s.bounds.width * sizeMult;
        const h = s.bounds.height * sizeMult;
        newSeats.push({
          ...s,
          bounds: {
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h,
          },
        });
      }
    }
  }

  const children = section.children
    ? section.children.map((c) => subsampleSection(c, linearKeep, sizeMult))
    : undefined;

  return { ...section, seats: newSeats, children };
}

/**
 * Returns `target` indices uniformly distributed across `[0, n)`. Endpoints
 * inclusive when target > 1 — so a row of 10 sampled to 3 returns [0, 4, 9],
 * keeping the visual footprint of the row.
 */
function pickUniformIndices(n: number, target: number): number[] {
  if (target >= n) {
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = i;
    return out;
  }
  if (target <= 0) return [];
  if (target === 1) return [Math.floor(n / 2)];
  const out = new Array<number>(target);
  const stride = (n - 1) / (target - 1);
  for (let i = 0; i < target; i++) {
    let idx = Math.round(i * stride);
    if (idx < 0) idx = 0;
    else if (idx >= n) idx = n - 1;
    out[i] = idx;
  }
  return out;
}

// ─── Per-section transforms: colors, names, prices, icons, rows ───

function applySectionTransforms(
  section: Section,
  patch: SectionOverride | undefined,
  globals: GlobalOverride,
  /**
   * Cascade from a parent's patch — used for container sections (e.g. cinema
   * halls) whose actual seats live in children. Visual props (fill/stroke/
   * icon/currency/row-start) propagate to direct children; name/price don't.
   */
  inherited?: SectionOverride
): Section {
  const patchOrInherit = <K extends keyof SectionOverride>(
    key: K
  ): SectionOverride[K] | undefined => patch?.[key] ?? inherited?.[key];

  const effectiveRowStart = patchOrInherit('rowStartLetter') ?? globals.rowStartLetter;
  const effectiveCurrency =
    patchOrInherit('currency') ?? globals.currency ?? section.currency;
  const effectiveIcon: SeatIcon | undefined =
    patchOrInherit('seatIcon') ?? globals.seatIcon ?? section.seatIcon;
  const effectiveFill = patchOrInherit('fill') ?? section.fill;
  const effectiveStroke = patchOrInherit('stroke') ?? section.stroke;

  const nothingOnSeats = !effectiveRowStart;
  const nothingElse =
    !patch &&
    !inherited &&
    effectiveCurrency === section.currency &&
    effectiveIcon === section.seatIcon &&
    !globals.seatIcon;

  // When the patch only sets `name` or `price` we still need a fresh clone so
  // React re-renders, but we can short-circuit deep work if nothing cascades.
  const cascade: SectionOverride = {
    ...(inherited ?? {}),
    ...(patch ?? {}),
  };
  // name / price are section-local — don't bleed into children.
  delete cascade.name;
  delete cascade.price;

  if (nothingOnSeats && nothingElse && !section.children) return section;

  const seats = nothingOnSeats
    ? section.seats
    : shiftRowLabels(section.seats, effectiveRowStart!);

  const children = section.children
    ? section.children.map((c) =>
        applySectionTransforms(c, undefined, globals, cascade)
      )
    : undefined;

  return {
    ...section,
    name: patch?.name ?? section.name,
    price: patch?.price ?? section.price,
    currency: effectiveCurrency,
    fill: effectiveFill,
    stroke: effectiveStroke,
    seatIcon: effectiveIcon,
    seats,
    children,
  };
}

/**
 * Shifts the alphabetic row cadence so the first distinct rowLabel becomes
 * `startLetter` and the rest follow. Supports single-letter rows (templates
 * only ship A, B, C…). Wraps to "AA", "AB" past Z.
 */
export function shiftRowLabels(seats: Seat[], startLetter: string): Seat[] {
  const target = (startLetter || 'A').trim().toUpperCase();
  if (!/^[A-Z]+$/.test(target)) return seats;

  const uniqueRows: string[] = [];
  const seen = new Set<string>();
  for (const s of seats) {
    if (!seen.has(s.rowLabel)) {
      seen.add(s.rowLabel);
      uniqueRows.push(s.rowLabel);
    }
  }
  // Stable sort by original rowLabel so cadence preserves alphabetical order.
  const sortedRows = [...uniqueRows].sort((a, b) => a.localeCompare(b));

  // Build: original rowLabel -> new rowLabel.
  const startIdx = alphaToIndex(target);
  const map = new Map<string, string>();
  sortedRows.forEach((row, i) => {
    map.set(row, indexToAlpha(startIdx + i));
  });

  return seats.map((s) => {
    const newRow = map.get(s.rowLabel) ?? s.rowLabel;
    if (newRow === s.rowLabel) return s;
    return { ...s, rowLabel: newRow, label: `${newRow}${s.seatNumber}` };
  });
}

function alphaToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) {
    n = n * 26 + (ch.charCodeAt(0) - 64); // 'A' == 1
  }
  return n - 1; // 0-based
}

function indexToAlpha(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

// ─── Seat-count <-> density bridge ────────────────────────────────

/**
 * Converts a target seat count into the density fraction the rest of the
 * pipeline expects. Clamps to a sensible floor so the user can never drive
 * the slider to zero retained seats. Returns 1 (no subsampling) when `base`
 * is unknown or the requested count exceeds the base total.
 */
export function seatCountToDensity(count: number, base: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(base) || base <= 0) return 1;
  const minCount = Math.max(10, Math.ceil(base * 0.05));
  const clamped = Math.max(minCount, Math.min(base, Math.round(count)));
  return clamped / base;
}

// ─── Aggregates for the UI ────────────────────────────────────────

/** Estimated total seats after density subsample (top-level sections only). */
export function countSeats(sections: Section[]): number {
  let n = 0;
  for (const s of sections) {
    n += s.seats.length;
    if (s.children) n += countSeats(s.children);
  }
  return n;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
