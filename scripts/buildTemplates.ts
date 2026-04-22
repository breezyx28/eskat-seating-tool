/**
 * Builds the 4 pre-built venue templates into src/templates/*.json
 * Run with: bun scripts/buildTemplates.ts
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

type SeatState = 'available' | 'reserved' | 'disabled';
type SectionShape = 'rectangle' | 'circle' | 'polygon' | 'ellipse' | 'stage' | 'arc';

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Seat {
  id: string;
  rowLabel: string;
  seatNumber: string;
  label: string;
  bounds: Bounds;
  state: SeatState;
  accessible: boolean;
}

interface Section {
  id: string;
  type: SectionShape;
  name: string;
  price: number;
  currency: string;
  bounds: Bounds;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  labelVisible: boolean;
  seats: Seat[];
  zIndex: number;
  seatIcon: string;
  points?: { x: number; y: number }[];
  cornerRadius?: number;
  pattern?: { type: string; color?: string; size?: number; spacing?: number; opacity?: number };
  interactions?: { tooltip?: string; clickAction?: string; hoverScale?: number };
  arc?: { startAngle: number; endAngle: number; innerRadius: number; outerRadius: number };
  children?: Section[];
}

interface StageElement {
  id: string;
  type: 'stage';
  label: string;
  bounds: Bounds;
  fill: string;
}

interface VenueData {
  version: string;
  venue: { name: string; width: number; height: number; background: string };
  sections: Section[];
  stage?: StageElement;
}

let counter = 0;
const id = (prefix: string) => `${prefix}-${(++counter).toString(36)}`;

function makeGrid(
  sectionId: string,
  cols: number,
  rows: number,
  startRow: string,
  seatSize: number,
  gap: number,
  margin: number,
  numberDirection: 'ltr' | 'rtl' = 'ltr',
  accessibleRow?: string
): Seat[] {
  const seats: Seat[] = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const startIdx = letters.indexOf(startRow.toUpperCase());
  for (let r = 0; r < rows; r++) {
    const rowLabel = startIdx >= 0 ? letters[startIdx + r] : String(parseInt(startRow) + r);
    for (let c = 0; c < cols; c++) {
      const num = numberDirection === 'rtl' ? cols - c : c + 1;
      seats.push({
        id: `${sectionId}-${rowLabel}${num}`,
        rowLabel,
        seatNumber: String(num),
        label: `${rowLabel}${num}`,
        bounds: {
          x: margin + c * (seatSize + gap),
          y: margin + r * (seatSize + gap),
          width: seatSize,
          height: seatSize,
        },
        state: 'available',
        accessible: accessibleRow === rowLabel && (num === 1 || num === cols),
      });
    }
  }
  return seats;
}

// Seats arranged in an arc — used for concert/theatre curves
function makeArcSeats(
  sectionId: string,
  rows: number,
  seatsPerRow: number,
  innerRadius: number,
  rowDepth: number,
  startAngle: number, // in radians, 0 = east, -PI/2 = north
  endAngle: number,
  seatSize: number,
  startRow: string,
  centerX: number,
  centerY: number,
  numberDirection: 'ltr' | 'rtl' = 'ltr'
): { seats: Seat[]; bounds: Bounds } {
  const seats: Seat[] = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const startIdx = letters.indexOf(startRow.toUpperCase());

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let r = 0; r < rows; r++) {
    const rowLabel = letters[startIdx + r];
    const radius = innerRadius + r * rowDepth;
    for (let c = 0; c < seatsPerRow; c++) {
      const t = seatsPerRow === 1 ? 0.5 : c / (seatsPerRow - 1);
      const angle = startAngle + t * (endAngle - startAngle);
      const x = centerX + Math.cos(angle) * radius - seatSize / 2;
      const y = centerY + Math.sin(angle) * radius - seatSize / 2;
      const num = numberDirection === 'rtl' ? seatsPerRow - c : c + 1;
      seats.push({
        id: `${sectionId}-${rowLabel}${num}`,
        rowLabel,
        seatNumber: String(num),
        label: `${rowLabel}${num}`,
        bounds: { x, y, width: seatSize, height: seatSize },
        state: 'available',
        accessible: false,
      });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + seatSize);
      maxY = Math.max(maxY, y + seatSize);
    }
  }

  // Shift seats so they're relative to the section bounds
  for (const seat of seats) {
    seat.bounds.x -= minX;
    seat.bounds.y -= minY;
  }

  return {
    seats,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  };
}

// ──────────────────────────────────────────────────────────────────
// CONCERT
// ──────────────────────────────────────────────────────────────────
function buildConcert(): VenueData {
  counter = 0;
  const W = 1800, H = 1200;
  const stage: StageElement = {
    id: 'stage',
    type: 'stage',
    label: 'STAGE',
    bounds: { x: W / 2 - 250, y: 80, width: 500, height: 90 },
    fill: '#334155',
  };

  const centerX = W / 2;
  const stageBase = stage.bounds.y + stage.bounds.height;

  const sections: Section[] = [];

  // VIP+ center rectangle
  {
    const sid = id('sec');
    const cols = 16, rows = 6;
    const seatSize = 18, gap = 4, margin = 16;
    const width = cols * seatSize + (cols - 1) * gap + margin * 2;
    const height = rows * seatSize + (rows - 1) * gap + margin * 2 + 8;
    sections.push({
      id: sid,
      type: 'rectangle',
      name: 'VIP+',
      price: 500,
      currency: '$',
      bounds: { x: centerX - width / 2, y: stageBase + 60, width, height },
      rotation: 0,
      fill: '#f59e0b55',
      stroke: '#f59e0b',
      strokeWidth: 2,
      opacity: 1,
      labelVisible: true,
      seats: makeGrid(sid, cols, rows, 'A', seatSize, gap, margin, 'ltr', 'A'),
      zIndex: 1,
      seatIcon: 'chair',
    });
  }

  // 3 concentric arcs: Section A / B / C
  const arcConfigs = [
    { name: 'Section A', price: 250, fill: '#a855f755', stroke: '#a855f7', startRow: 'A', rows: 6, seatsPerRow: 24, innerRadius: 340 },
    { name: 'Section B', price: 150, fill: '#7c3aed55', stroke: '#7c3aed', startRow: 'A', rows: 7, seatsPerRow: 30, innerRadius: 500 },
    { name: 'Section C', price: 80, fill: '#6366f155', stroke: '#6366f1', startRow: 'A', rows: 8, seatsPerRow: 36, innerRadius: 680 },
  ];
  for (let i = 0; i < arcConfigs.length; i++) {
    const cfg = arcConfigs[i];
    const sid = id('sec');
    const { seats, bounds } = makeArcSeats(
      sid,
      cfg.rows,
      cfg.seatsPerRow,
      cfg.innerRadius,
      26,
      Math.PI + 0.3,
      2 * Math.PI - 0.3,
      18,
      cfg.startRow,
      centerX,
      stageBase + 40
    );
    sections.push({
      id: sid,
      type: 'polygon',
      name: cfg.name,
      price: cfg.price,
      currency: '$',
      bounds,
      rotation: 0,
      fill: cfg.fill,
      stroke: cfg.stroke,
      strokeWidth: 1,
      opacity: 1,
      labelVisible: true,
      seats,
      zIndex: i + 2,
      seatIcon: 'chair',
      points: computeArcPolygon(
        centerX - bounds.x,
        stageBase + 40 - bounds.y,
        cfg.innerRadius - 8,
        cfg.innerRadius + cfg.rows * 26 + 4,
        Math.PI + 0.3,
        2 * Math.PI - 0.3
      ),
    });
  }

  return {
    version: '1.0',
    venue: { name: 'Eskat Concert Hall', width: W, height: H, background: '#0f172a' },
    sections,
    stage,
  };
}

function computeArcPolygon(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  a1: number,
  a2: number,
  steps = 36
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a1 + t * (a2 - a1);
    out.push({ x: cx + Math.cos(a) * outerR, y: cy + Math.sin(a) * outerR });
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = a1 + t * (a2 - a1);
    out.push({ x: cx + Math.cos(a) * innerR, y: cy + Math.sin(a) * innerR });
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────
// STADIUM
// ──────────────────────────────────────────────────────────────────
function buildStadium(): VenueData {
  counter = 0;
  const W = 1800, H = 1200;

  // Pitch / field rectangle as stage-like element
  const pitch: StageElement = {
    id: 'pitch',
    type: 'stage',
    label: 'FIELD',
    bounds: { x: 550, y: 420, width: 700, height: 360 },
    fill: '#16a34a',
  };

  const sections: Section[] = [];

  const tiers = [
    { name: 'T.GOLD', price: 300, fill: '#f59e0b55', stroke: '#f59e0b' },
    { name: 'T.BRONZ', price: 150, fill: '#b45309aa', stroke: '#b45309' },
    { name: 'STANDARD', price: 80, fill: '#6366f155', stroke: '#6366f1' },
  ];

  // North stand (top) + South stand (bottom) + West/East stands
  // Each tier row on top: 3 sections along the length
  const tierDepth = 90;
  const topY = 120;
  const bottomY = H - 120;

  for (let t = 0; t < tiers.length; t++) {
    const cfg = tiers[t];
    const rowSpacing = 22;
    const rowCount = 3;
    const offset = t * (tierDepth + 10);

    // NORTH stand — 3 sections side by side
    for (let i = 0; i < 3; i++) {
      const sid = id('sec');
      const cols = 14;
      const seatSize = 14, gap = 3, margin = 10;
      const width = cols * seatSize + (cols - 1) * gap + margin * 2;
      const height = rowCount * seatSize + (rowCount - 1) * rowSpacing + margin * 2;
      const sectionWidth = 220;
      const x = 400 + i * (sectionWidth + 10);
      sections.push({
        id: sid,
        type: 'rectangle',
        name: `N-${cfg.name}-${i + 1}`,
        price: cfg.price,
        currency: '$',
        bounds: { x, y: topY + offset, width: sectionWidth, height },
        rotation: 0,
        fill: cfg.fill,
        stroke: cfg.stroke,
        strokeWidth: 1,
        opacity: 1,
        labelVisible: true,
        seats: makeGrid(sid, cols, rowCount, 'A', seatSize, gap, margin),
        zIndex: t + 1,
        seatIcon: 'rounded',
      });
    }
    // SOUTH stand
    for (let i = 0; i < 3; i++) {
      const sid = id('sec');
      const cols = 14;
      const seatSize = 14, gap = 3, margin = 10;
      const width = cols * seatSize + (cols - 1) * gap + margin * 2;
      const height = rowCount * seatSize + (rowCount - 1) * rowSpacing + margin * 2;
      const sectionWidth = 220;
      const x = 400 + i * (sectionWidth + 10);
      const y = bottomY - offset - height;
      sections.push({
        id: sid,
        type: 'rectangle',
        name: `S-${cfg.name}-${i + 1}`,
        price: cfg.price,
        currency: '$',
        bounds: { x, y, width: sectionWidth, height },
        rotation: 0,
        fill: cfg.fill,
        stroke: cfg.stroke,
        strokeWidth: 1,
        opacity: 1,
        labelVisible: true,
        seats: makeGrid(sid, cols, rowCount, 'A', seatSize, gap, margin),
        zIndex: t + 1,
        seatIcon: 'rounded',
      });
    }

    // WEST stand
    {
      const sid = id('sec');
      const cols = 3;
      const rowsL = 10;
      const seatSize = 14, gap = 3, margin = 10;
      const width = cols * seatSize + (cols - 1) * gap + margin * 2;
      const height = rowsL * seatSize + (rowsL - 1) * gap + margin * 2;
      sections.push({
        id: sid,
        type: 'rectangle',
        name: `W-${cfg.name}`,
        price: cfg.price,
        currency: '$',
        bounds: { x: 200 + offset, y: 400, width, height },
        rotation: 0,
        fill: cfg.fill,
        stroke: cfg.stroke,
        strokeWidth: 1,
        opacity: 1,
        labelVisible: true,
        seats: makeGrid(sid, cols, rowsL, 'A', seatSize, gap, margin),
        zIndex: t + 1,
        seatIcon: 'rounded',
      });
    }
    // EAST stand
    {
      const sid = id('sec');
      const cols = 3;
      const rowsL = 10;
      const seatSize = 14, gap = 3, margin = 10;
      const width = cols * seatSize + (cols - 1) * gap + margin * 2;
      const height = rowsL * seatSize + (rowsL - 1) * gap + margin * 2;
      sections.push({
        id: sid,
        type: 'rectangle',
        name: `E-${cfg.name}`,
        price: cfg.price,
        currency: '$',
        bounds: { x: W - 200 - width - offset, y: 400, width, height },
        rotation: 0,
        fill: cfg.fill,
        stroke: cfg.stroke,
        strokeWidth: 1,
        opacity: 1,
        labelVisible: true,
        seats: makeGrid(sid, cols, rowsL, 'A', seatSize, gap, margin, 'rtl'),
        zIndex: t + 1,
        seatIcon: 'rounded',
      });
    }
  }

  // VIP boxes on either side of field
  for (let i = 0; i < 3; i++) {
    const sid = id('sec');
    const cols = 4, rows = 2;
    const seatSize = 14, gap = 3, margin = 8;
    const width = cols * seatSize + (cols - 1) * gap + margin * 2;
    const height = rows * seatSize + (rows - 1) * gap + margin * 2;
    sections.push({
      id: sid,
      type: 'rectangle',
      name: `VIP ${i + 1}`,
      price: 600,
      currency: '$',
      bounds: { x: 460, y: 380 + i * 150, width, height },
      rotation: 0,
      fill: '#eab30855',
      stroke: '#eab308',
      strokeWidth: 2,
      opacity: 1,
      labelVisible: true,
      seats: makeGrid(sid, cols, rows, 'A', seatSize, gap, margin),
      zIndex: 10,
      seatIcon: 'chair',
    });
  }

  return {
    version: '1.0',
    venue: { name: 'Eskat Stadium', width: W, height: H, background: '#0f172a' },
    sections,
    stage: pitch,
  };
}

// ──────────────────────────────────────────────────────────────────
// THEATRE
// ──────────────────────────────────────────────────────────────────
function buildTheatre(): VenueData {
  counter = 0;
  const W = 1800, H = 1200;
  const stage: StageElement = {
    id: 'stage',
    type: 'stage',
    label: 'STAGE',
    bounds: { x: W / 2 - 300, y: 100, width: 600, height: 80 },
    fill: '#334155',
  };

  const sections: Section[] = [];
  const centerX = W / 2;
  const baseY = 240;

  const tiers = [
    { name: 'Orchestra', price: 200, rows: 10, innerR: 280, depth: 30, fill: '#a855f755', stroke: '#a855f7', seatsPerRow: 28 },
    { name: 'Mezzanine', price: 130, rows: 6, innerR: 620, depth: 32, fill: '#7c3aed55', stroke: '#7c3aed', seatsPerRow: 34 },
    { name: 'Balcony', price: 70, rows: 5, innerR: 840, depth: 34, fill: '#6366f155', stroke: '#6366f1', seatsPerRow: 38 },
  ];

  for (let t = 0; t < tiers.length; t++) {
    const cfg = tiers[t];
    const sid = id('sec');
    const { seats, bounds } = makeArcSeats(
      sid,
      cfg.rows,
      cfg.seatsPerRow,
      cfg.innerR,
      cfg.depth,
      Math.PI + 0.5,
      2 * Math.PI - 0.5,
      18,
      'A',
      centerX,
      baseY
    );
    sections.push({
      id: sid,
      type: 'polygon',
      name: cfg.name,
      price: cfg.price,
      currency: '$',
      bounds,
      rotation: 0,
      fill: cfg.fill,
      stroke: cfg.stroke,
      strokeWidth: 1,
      opacity: 1,
      labelVisible: true,
      seats,
      zIndex: t + 1,
      seatIcon: 'chair',
      points: computeArcPolygon(
        centerX - bounds.x,
        baseY - bounds.y,
        cfg.innerR - 10,
        cfg.innerR + cfg.rows * cfg.depth + 4,
        Math.PI + 0.5,
        2 * Math.PI - 0.5
      ),
    });
  }

  return {
    version: '1.0',
    venue: { name: 'Eskat Theatre', width: W, height: H, background: '#0f172a' },
    sections,
    stage,
  };
}

// ──────────────────────────────────────────────────────────────────
// ARENA
// ──────────────────────────────────────────────────────────────────
function buildArena(): VenueData {
  counter = 0;
  const W = 1800, H = 1200;

  const center: StageElement = {
    id: 'center',
    type: 'stage',
    label: 'CENTER',
    bounds: { x: W / 2 - 180, y: H / 2 - 90, width: 360, height: 180 },
    fill: '#334155',
  };

  const sections: Section[] = [];
  const cx = W / 2, cy = H / 2;

  const rings = [
    { name: 'Ring 1', price: 400, innerR: 280, rings: 4, fill: '#f59e0b55', stroke: '#f59e0b' },
    { name: 'Ring 2', price: 200, innerR: 420, rings: 5, fill: '#a855f755', stroke: '#a855f7' },
    { name: 'Ring 3', price: 100, innerR: 580, rings: 6, fill: '#6366f155', stroke: '#6366f1' },
  ];

  // Split each ring into 4 quadrants (N/E/S/W)
  const quadrants = [
    { name: 'N', start: -Math.PI * 0.75, end: -Math.PI * 0.25 },
    { name: 'E', start: -Math.PI * 0.25, end: Math.PI * 0.25 },
    { name: 'S', start: Math.PI * 0.25, end: Math.PI * 0.75 },
    { name: 'W', start: Math.PI * 0.75, end: Math.PI * 1.25 },
  ];

  for (let r = 0; r < rings.length; r++) {
    const cfg = rings[r];
    for (let q = 0; q < quadrants.length; q++) {
      const quad = quadrants[q];
      const sid = id('sec');
      const seatsPerRow = 20;
      const { seats, bounds } = makeArcSeats(
        sid,
        cfg.rings,
        seatsPerRow,
        cfg.innerR,
        28,
        quad.start + 0.05,
        quad.end - 0.05,
        16,
        'A',
        cx,
        cy
      );
      sections.push({
        id: sid,
        type: 'polygon',
        name: `${cfg.name} ${quad.name}`,
        price: cfg.price,
        currency: '$',
        bounds,
        rotation: 0,
        fill: cfg.fill,
        stroke: cfg.stroke,
        strokeWidth: 1,
        opacity: 1,
        labelVisible: true,
        seats,
        zIndex: r + 1,
        seatIcon: 'rounded',
        points: computeArcPolygon(
          cx - bounds.x,
          cy - bounds.y,
          cfg.innerR - 10,
          cfg.innerR + cfg.rings * 28 + 4,
          quad.start + 0.05,
          quad.end - 0.05
        ),
      });
    }
  }

  return {
    version: '1.0',
    venue: { name: 'Eskat Arena', width: W, height: H, background: '#0f172a' },
    sections,
    stage: center,
  };
}

// ──────────────────────────────────────────────────────────────────
// CINEMA COMPLEX (hierarchical)
//   Top-level container sections represent individual cinema halls.
//   Drilling into a hall reveals its seat layout.
// ──────────────────────────────────────────────────────────────────
function buildCinemaComplex(): VenueData {
  counter = 0;
  const W = 1800, H = 1200;

  const lobby: StageElement = {
    id: 'lobby',
    type: 'stage',
    label: 'LOBBY / ENTRANCE',
    bounds: { x: W / 2 - 360, y: H - 160, width: 720, height: 90 },
    fill: '#334155',
  };

  const sections: Section[] = [];

  // 6 cinema halls laid out in a 3×2 grid, each is a container the user drills into.
  const hallCfgs = [
    { name: 'Hall 1 — IMAX', price: 22, fill: '#f59e0b33', stroke: '#f59e0b', rows: 12, cols: 22, seatSize: 20 },
    { name: 'Hall 2 — Standard', price: 14, fill: '#6366f133', stroke: '#6366f1', rows: 10, cols: 18, seatSize: 18 },
    { name: 'Hall 3 — Standard', price: 14, fill: '#6366f133', stroke: '#6366f1', rows: 10, cols: 18, seatSize: 18 },
    { name: 'Hall 4 — VIP', price: 32, fill: '#a855f733', stroke: '#a855f7', rows: 8, cols: 14, seatSize: 22 },
    { name: 'Hall 5 — Standard', price: 14, fill: '#6366f133', stroke: '#6366f1', rows: 10, cols: 18, seatSize: 18 },
    { name: 'Hall 6 — Dolby Atmos', price: 28, fill: '#ec489933', stroke: '#ec4899', rows: 11, cols: 20, seatSize: 20 },
  ];

  const cols = 3;
  const rows = 2;
  const pad = 60;
  const availW = W - pad * 2;
  const availH = H - pad * 2 - 180; // reserve space for lobby
  const cellW = (availW - pad * (cols - 1)) / cols;
  const cellH = (availH - pad * (rows - 1)) / rows;

  for (let i = 0; i < hallCfgs.length; i++) {
    const cfg = hallCfgs[i];
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = pad + col * (cellW + pad);
    const y = pad + row * (cellH + pad);

    const hallId = `hall-${i + 1}`;

    // ── child leaf section that holds the actual seats (screen + seating grid) ──
    const screenId = `${hallId}-screen`;
    const seatsId = `${hallId}-seats`;

    // Screen (decorative, no seats) at top of hall interior
    const interiorPad = 30;
    const screenW = cellW - interiorPad * 2;
    const screen: Section = {
      id: screenId,
      type: 'rectangle',
      name: 'Screen',
      price: 0,
      currency: '$',
      bounds: { x: x + interiorPad, y: y + interiorPad, width: screenW, height: 36 },
      rotation: 0,
      fill: '#e2e8f0',
      stroke: '#94a3b8',
      strokeWidth: 1,
      opacity: 1,
      labelVisible: true,
      seats: [],
      zIndex: 1,
      seatIcon: 'chair',
      cornerRadius: 6,
      interactions: { clickAction: 'select', hoverScale: 1 },
    };

    // Seat grid
    const gap = 4, margin = 18;
    const gridW = cfg.cols * cfg.seatSize + (cfg.cols - 1) * gap + margin * 2;
    const gridH = cfg.rows * cfg.seatSize + (cfg.rows - 1) * gap + margin * 2;
    const gridX = x + (cellW - gridW) / 2;
    const gridY = y + interiorPad + 36 + 20;

    const seatingRow: Section = {
      id: seatsId,
      type: 'rectangle',
      name: 'Seating',
      price: cfg.price,
      currency: '$',
      bounds: { x: gridX, y: gridY, width: gridW, height: gridH },
      rotation: 0,
      fill: cfg.fill,
      stroke: cfg.stroke,
      strokeWidth: 1,
      opacity: 1,
      labelVisible: false,
      seats: makeGrid(seatsId, cfg.cols, cfg.rows, 'A', cfg.seatSize, gap, margin, 'ltr', 'A'),
      zIndex: 2,
      seatIcon: 'rounded',
      cornerRadius: 10,
      interactions: { clickAction: 'select', hoverScale: 1 },
    };

    // Container hall
    sections.push({
      id: hallId,
      type: 'rectangle',
      name: cfg.name,
      price: cfg.price,
      currency: '$',
      bounds: { x, y, width: cellW, height: cellH },
      rotation: 0,
      fill: cfg.fill,
      stroke: cfg.stroke,
      strokeWidth: 2,
      opacity: 1,
      labelVisible: true,
      seats: [],
      zIndex: i + 1,
      seatIcon: 'rounded',
      cornerRadius: 16,
      pattern: { type: 'dots', color: cfg.stroke, size: 2, spacing: 18, opacity: 0.22 },
      interactions: { tooltip: `${cfg.name} — from ${cfg.price} $`, clickAction: 'drillIn', hoverScale: 1.02 },
      children: [screen, seatingRow],
    });
  }

  return {
    version: '1.0',
    venue: { name: 'Eskat Cinema Complex', width: W, height: H, background: '#0f172a' },
    sections,
    stage: lobby,
  };
}

// ──────────────────────────────────────────────────────────────────
// WRITE
// ──────────────────────────────────────────────────────────────────
const outDir = join(import.meta.dir, '..', 'src', 'templates');

const all = {
  'concert.json': buildConcert(),
  'stadium.json': buildStadium(),
  'theatre.json': buildTheatre(),
  'arena.json': buildArena(),
  'cinema-complex.json': buildCinemaComplex(),
};

function countSeats(sections: Section[]): number {
  let n = 0;
  for (const s of sections) {
    n += s.seats.length;
    if (s.children?.length) n += countSeats(s.children);
  }
  return n;
}

for (const [name, data] of Object.entries(all)) {
  const text = JSON.stringify(data, null, 2);
  writeFileSync(join(outDir, name), text);
  console.log(`✓ ${name} — ${data.sections.length} top-level sections, ${countSeats(data.sections)} seats`);
}
