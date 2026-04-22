import { nanoid } from 'nanoid';
import type { Seat, SeatGenConfig, ArcSpec, Section } from '@/types';
import { rectInsideSection } from './shapeGeometry';

export interface GenerateSeatsOptions {
  /** When provided, seats whose bounds fall outside this section's exact
   *  geometric shape are discarded (circle, ellipse, polygon, arc, etc.).
   *  Coordinates in `config.offsetX/offsetY` are section-local — same frame the
   *  section's geometry lives in, so no conversion is required. */
  clipTo?: Section;
}

/**
 * Generate a grid of seats from a configuration. Returns an array of Seat
 * objects positioned in section-local coordinates (top-left origin).
 *
 * Row labels accept:
 *  - 'A' (or any single letter) -> A, B, C, ... Z, AA, AB, ...
 *  - A numeric string like '1' -> 1, 2, 3, ...
 *  - Anything else is used as a literal prefix for row 1, with numeric suffix.
 */
export function generateSeats(config: SeatGenConfig, options: GenerateSeatsOptions = {}): Seat[] {
  const {
    rows,
    cols,
    rowSpacing,
    colSpacing,
    seatWidth,
    seatHeight,
    startRowLabel,
    numberDirection,
    offsetX,
    offsetY,
  } = config;

  const seats: Seat[] = [];
  if (rows <= 0 || cols <= 0) return seats;

  const clip = options.clipTo;

  for (let r = 0; r < rows; r++) {
    const rowSeats: Seat[] = [];
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * (seatWidth + colSpacing);
      const y = offsetY + r * (seatHeight + rowSpacing);
      if (clip && !rectInsideSection(clip, { x, y, width: seatWidth, height: seatHeight })) {
        continue;
      }
      rowSeats.push({
        id: nanoid(),
        rowLabel: '',
        seatNumber: '',
        label: '',
        bounds: { x, y, width: seatWidth, height: seatHeight },
        state: 'available',
        accessible: false,
      });
    }
    if (!rowSeats.length) continue;
    // Re-index surviving seats so row labels/numbers stay dense when clipping
    // removes whole rows or trims row ends.
    const rowLabel = makeRowLabel(startRowLabel, uniqueRowIndex(seats));
    const dense = numberDirection === 'rtl' ? [...rowSeats].reverse() : rowSeats;
    dense.forEach((seat, idx) => {
      const seatIndex = idx + 1;
      seat.rowLabel = rowLabel;
      seat.seatNumber = String(seatIndex);
      seat.label = `${rowLabel}${seatIndex}`;
    });
    seats.push(...rowSeats);
  }
  return seats;
}

/** Count distinct row labels already emitted — used to keep row letters dense
 *  when clipping removes whole rows. */
function uniqueRowIndex(seats: Seat[]): number {
  const set = new Set<string>();
  for (const s of seats) set.add(s.rowLabel);
  return set.size;
}

/**
 * Compute total width/height of the grid produced by `generateSeats`.
 */
export function computeGridSize(config: SeatGenConfig) {
  const w = config.offsetX * 2 + config.cols * config.seatWidth + Math.max(0, config.cols - 1) * config.colSpacing;
  const h = config.offsetY * 2 + config.rows * config.seatHeight + Math.max(0, config.rows - 1) * config.rowSpacing;
  return { width: w, height: h };
}

export interface ArcSeatGenConfig {
  arc: ArcSpec;
  /** center of the arc in local section coordinates */
  cx: number;
  cy: number;
  rows: number;
  cols: number;
  seatWidth: number;
  seatHeight: number;
  startRowLabel?: string;
  numberDirection?: 'ltr' | 'rtl';
}

/**
 * Distributes seats along concentric rows of an arc section. Row `0` sits on
 * the innermost radius; row `rows-1` on the outermost. Seats are evenly spaced
 * in angle within each row.
 */
export function seatsAlongArc(config: ArcSeatGenConfig): Seat[] {
  const {
    arc,
    cx,
    cy,
    rows,
    cols,
    seatWidth,
    seatHeight,
    startRowLabel = 'A',
    numberDirection = 'ltr',
  } = config;

  const seats: Seat[] = [];
  if (rows <= 0 || cols <= 0) return seats;

  const rStep = rows === 1 ? 0 : (arc.outerRadius - arc.innerRadius) / (rows - 1);
  const angleStep = cols === 1 ? 0 : (arc.endAngle - arc.startAngle) / (cols - 1);

  for (let r = 0; r < rows; r++) {
    const rowLabel = makeRowLabel(startRowLabel, r);
    const radius = arc.innerRadius + r * rStep;
    for (let c = 0; c < cols; c++) {
      const seatIndex = numberDirection === 'rtl' ? cols - c : c + 1;
      const a = arc.startAngle + c * angleStep;
      const x = cx + Math.cos(a) * radius - seatWidth / 2;
      const y = cy + Math.sin(a) * radius - seatHeight / 2;
      seats.push({
        id: nanoid(),
        rowLabel,
        seatNumber: String(seatIndex),
        label: `${rowLabel}${seatIndex}`,
        bounds: { x, y, width: seatWidth, height: seatHeight },
        state: 'available',
        accessible: false,
      });
    }
  }
  return seats;
}

function makeRowLabel(startRowLabel: string, index: number): string {
  // Empty → fall back to numbers
  if (!startRowLabel) return String(index + 1);

  // If the label is purely numeric, increment as a number
  if (/^\d+$/.test(startRowLabel)) {
    return String(parseInt(startRowLabel, 10) + index);
  }

  // If the label is a single letter, increment alphabetically (A, B, ..., Z, AA, AB, ...)
  if (/^[A-Za-z]$/.test(startRowLabel)) {
    const upper = startRowLabel.toUpperCase();
    const startCode = upper.charCodeAt(0) - 65;
    const n = startCode + index;
    return numberToLetters(n).toUpperCase();
  }

  // Otherwise use as prefix with a numeric suffix
  return `${startRowLabel}${index + 1}`;
}

function numberToLetters(n: number): string {
  let s = '';
  n = Math.max(0, Math.floor(n));
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}
