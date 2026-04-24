import type { Section, Seat, VenueData } from '@/types';

export type BenchmarkLayout = 'single-grid' | 'multi-section' | 'theatre-rows';

export interface BenchmarkVenueOptions {
  seatCount: number;
  layout: BenchmarkLayout;
}

// Keep the layout deterministic so consecutive builds with the same options
// produce identical seat ids (useful for parity diffs and React key stability).
function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) & 0xffffffff) / 0xffffffff;
  };
}

function makeSeatId(prefix: string, r: number, c: number): string {
  return `${prefix}-r${r}-c${c}`;
}

function rowLabel(index: number): string {
  let result = '';
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

const SEAT_W = 20;
const SEAT_H = 20;
const SEAT_GAP = 4;
const SECTION_PAD = 60;

function buildGridSection(options: {
  id: string;
  name: string;
  originX: number;
  originY: number;
  rows: number;
  cols: number;
  maxSeats: number;
  price: number;
  fill: string;
  rand: () => number;
}): Section {
  const {
    id,
    name,
    originX,
    originY,
    rows,
    cols,
    maxSeats,
    price,
    fill,
    rand,
  } = options;
  const seats: Seat[] = [];
  const accessibleEvery = Math.max(25, Math.floor(cols * rows / 30));
  let seatIdx = 0;
  outer: for (let r = 0; r < rows; r++) {
    const rLabel = rowLabel(r);
    for (let c = 0; c < cols; c++) {
      if (seats.length >= maxSeats) break outer;
      const x = c * (SEAT_W + SEAT_GAP);
      const y = r * (SEAT_H + SEAT_GAP);
      // 2% reserved, 1% disabled — gives some visual diversity without
      // biasing the perf numbers.
      const roll = rand();
      const state: 'available' | 'reserved' | 'disabled' =
        roll < 0.02 ? 'reserved' : roll < 0.03 ? 'disabled' : 'available';
      seats.push({
        id: makeSeatId(id, r, c),
        rowLabel: rLabel,
        seatNumber: String(c + 1),
        label: `${rLabel}${c + 1}`,
        bounds: { x, y, width: SEAT_W, height: SEAT_H },
        state,
        accessible: seatIdx % accessibleEvery === accessibleEvery - 1,
      });
      seatIdx++;
    }
  }
  const width = cols * (SEAT_W + SEAT_GAP);
  const height = rows * (SEAT_H + SEAT_GAP);
  return {
    id,
    type: 'rectangle',
    name,
    price,
    currency: '$',
    bounds: { x: originX, y: originY, width, height },
    rotation: 0,
    fill,
    stroke: 'rgba(255,255,255,0.15)',
    strokeWidth: 1,
    opacity: 1,
    labelVisible: true,
    seats,
    zIndex: 1,
    cornerRadius: 8,
  };
}

export function buildBenchmarkVenue(options: BenchmarkVenueOptions): VenueData {
  const seatCount = Math.max(0, Math.floor(options.seatCount));
  const rand = seededRandom(seatCount || 1);

  if (options.layout === 'single-grid' || seatCount <= 2000) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(seatCount)));
    const rows = Math.max(1, Math.ceil(seatCount / cols));
    const section = buildGridSection({
      id: 'bench-grid',
      name: `Grid (${seatCount.toLocaleString()} seats)`,
      originX: SECTION_PAD,
      originY: SECTION_PAD,
      rows,
      cols,
      maxSeats: seatCount,
      price: 50,
      fill: '#1e293b',
      rand,
    });
    const width = section.bounds.x + section.bounds.width + SECTION_PAD;
    const height = section.bounds.y + section.bounds.height + SECTION_PAD;
    return {
      version: '1.0.0',
      venue: {
        name: `Benchmark — ${seatCount.toLocaleString()} seats`,
        width,
        height,
        background: '#0f172a',
      },
      sections: [section],
    };
  }

  if (options.layout === 'multi-section') {
    // Split seats evenly across a 3x3 grid of sections (9 sections).
    const sectionCount = 9;
    const perSection = Math.ceil(seatCount / sectionCount);
    const sectionCols = Math.max(1, Math.ceil(Math.sqrt(perSection)));
    const sectionRows = Math.max(1, Math.ceil(perSection / sectionCols));
    const sectionW = sectionCols * (SEAT_W + SEAT_GAP);
    const sectionH = sectionRows * (SEAT_H + SEAT_GAP);
    const gap = 40;
    const sections: Section[] = [];
    let remaining = seatCount;
    const palette = ['#1e293b', '#1e3a8a', '#064e3b', '#78350f', '#7c2d12', '#134e4a', '#312e81', '#701a75', '#5b21b6'];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const idx = row * 3 + col;
        const take = Math.min(perSection, Math.max(0, remaining));
        remaining -= take;
        sections.push(
          buildGridSection({
            id: `bench-sec-${idx}`,
            name: `Section ${idx + 1}`,
            originX: SECTION_PAD + col * (sectionW + gap),
            originY: SECTION_PAD + row * (sectionH + gap),
            rows: sectionRows,
            cols: sectionCols,
            maxSeats: take,
            price: 50 + idx * 10,
            fill: palette[idx % palette.length],
            rand,
          })
        );
      }
    }
    const width = SECTION_PAD * 2 + 3 * sectionW + 2 * gap;
    const height = SECTION_PAD * 2 + 3 * sectionH + 2 * gap;
    return {
      version: '1.0.0',
      venue: {
        name: `Benchmark (multi) — ${seatCount.toLocaleString()} seats`,
        width,
        height,
        background: '#0f172a',
      },
      sections,
    };
  }

  // theatre-rows: many thin sections, one per row-cluster, stacked vertically.
  const rowsPerSection = 4;
  const targetCols = Math.max(10, Math.ceil(Math.sqrt(seatCount) * 1.4));
  const sectionSeatCap = rowsPerSection * targetCols;
  const sectionCount = Math.max(1, Math.ceil(seatCount / sectionSeatCap));
  const sections: Section[] = [];
  const palette = ['#1e293b', '#1e3a8a', '#064e3b', '#78350f', '#7c2d12'];
  let remaining = seatCount;
  for (let i = 0; i < sectionCount; i++) {
    const take = Math.min(sectionSeatCap, Math.max(0, remaining));
    remaining -= take;
    sections.push(
      buildGridSection({
        id: `bench-row-${i}`,
        name: `Tier ${i + 1}`,
        originX: SECTION_PAD,
        originY: SECTION_PAD + i * (rowsPerSection * (SEAT_H + SEAT_GAP) + 32),
        rows: rowsPerSection,
        cols: targetCols,
        maxSeats: take,
        price: 30 + i * 5,
        fill: palette[i % palette.length],
        rand,
      })
    );
  }
  const lastSection = sections[sections.length - 1];
  const width = SECTION_PAD * 2 + targetCols * (SEAT_W + SEAT_GAP);
  const height = lastSection.bounds.y + lastSection.bounds.height + SECTION_PAD;
  return {
    version: '1.0.0',
    venue: {
      name: `Benchmark (theatre) — ${seatCount.toLocaleString()} seats`,
      width,
      height,
      background: '#0f172a',
    },
    sections,
  };
}
