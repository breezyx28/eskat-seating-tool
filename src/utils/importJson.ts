import type { VenueData, Section, Seat, StageElement, PatternType } from '@/types';
import { sanitizeSvg } from './sanitizeSvg';

export class ImportError extends Error {}

/**
 * Parse a JSON string into a VenueData object. Throws ImportError on any
 * structural or schema-version problem.
 */
export function parseVenueData(json: string): VenueData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new ImportError('Invalid JSON file: ' + (err as Error).message);
  }

  if (!isObject(parsed)) throw new ImportError('Root must be an object');
  const root = parsed as Record<string, unknown>;

  const version = typeof root.version === 'string' ? root.version : '1.0';
  const major = parseInt(version.split('.')[0] ?? '1', 10);
  if (!Number.isFinite(major) || major !== 1) {
    throw new ImportError(
      `Unsupported schema version: ${version}. This tool supports 1.x.`
    );
  }

  const venueRaw = root.venue;
  if (!isObject(venueRaw)) throw new ImportError('Missing venue block');
  const venue = venueRaw as Record<string, unknown>;

  const sectionsRaw = root.sections;
  if (!Array.isArray(sectionsRaw)) throw new ImportError('sections must be an array');

  const data: VenueData = {
    version: '1.0',
    venue: {
      name: stringOr(venue.name, 'Imported Venue'),
      width: numberOr(venue.width, 1800),
      height: numberOr(venue.height, 1200),
      background: stringOr(venue.background, '#0f172a'),
    },
    sections: sectionsRaw.map(normalizeSection),
  };

  if (isObject(root.stage)) {
    data.stage = normalizeStage(root.stage as Record<string, unknown>);
  }

  return data;
}

function normalizeSection(raw: unknown, index: number): Section {
  if (!isObject(raw)) throw new ImportError(`Section ${index} is not an object`);
  const r = raw as Record<string, unknown>;
  const bounds = isObject(r.bounds) ? (r.bounds as Record<string, unknown>) : {};
  const seatsRaw = Array.isArray(r.seats) ? r.seats : [];
  const childrenRaw = Array.isArray(r.children) ? r.children : null;

  const section: Section = {
    id: stringOr(r.id, `sec-${index}`),
    type: stringOr(r.type, 'rectangle') as Section['type'],
    name: stringOr(r.name, `Section ${index + 1}`),
    price: numberOr(r.price, 0),
    currency: stringOr(r.currency, '$'),
    bounds: {
      x: numberOr(bounds.x, 0),
      y: numberOr(bounds.y, 0),
      width: numberOr(bounds.width, 200),
      height: numberOr(bounds.height, 150),
    },
    rotation: numberOr(r.rotation, 0),
    fill: stringOr(r.fill, '#a855f733'),
    stroke: stringOr(r.stroke, '#a855f7'),
    strokeWidth: numberOr(r.strokeWidth, 1),
    opacity: numberOr(r.opacity, 0.95),
    labelVisible: boolOr(r.labelVisible, true),
    seats: childrenRaw ? [] : seatsRaw.map((s, i) => normalizeSeat(s, i)),
    zIndex: numberOr(r.zIndex, index),
    seatIcon: (stringOr(r.seatIcon, 'chair')) as Section['seatIcon'],
  };

  if (Array.isArray(r.points)) {
    section.points = r.points
      .filter((p) => isObject(p))
      .map((p) => {
        const pp = p as Record<string, unknown>;
        return { x: numberOr(pp.x, 0), y: numberOr(pp.y, 0) };
      });
  }

  if (typeof r.cornerRadius === 'number') section.cornerRadius = r.cornerRadius;

  if (isObject(r.customSeatIcon)) {
    const ci = r.customSeatIcon as Record<string, unknown>;
    const svg = typeof ci.svg === 'string' ? sanitizeSvg(ci.svg) : '';
    if (svg) {
      section.customSeatIcon = {
        svg,
        name: typeof ci.name === 'string' ? ci.name : undefined,
      };
    }
  }

  if (isObject(r.pattern)) {
    const p = r.pattern as Record<string, unknown>;
    const rawType = typeof p.type === 'string' ? p.type : 'none';
    const allowed: PatternType[] = ['none', 'dots', 'grid', 'stripes', 'custom'];
    const patternType: PatternType = (allowed as string[]).includes(rawType)
      ? (rawType as PatternType)
      : 'none';
    section.pattern = {
      type: patternType,
      color: typeof p.color === 'string' ? p.color : undefined,
      size: typeof p.size === 'number' ? p.size : undefined,
      spacing: typeof p.spacing === 'number' ? p.spacing : undefined,
      customSvg: typeof p.customSvg === 'string' ? p.customSvg : undefined,
      opacity: typeof p.opacity === 'number' ? p.opacity : undefined,
    };
  }

  if (isObject(r.interactions)) {
    const i = r.interactions as Record<string, unknown>;
    section.interactions = {
      tooltip: typeof i.tooltip === 'string' ? i.tooltip : undefined,
      clickAction:
        i.clickAction === 'select' ||
        i.clickAction === 'drillIn' ||
        i.clickAction === 'url' ||
        i.clickAction === 'event'
          ? i.clickAction
          : undefined,
      url: typeof i.url === 'string' ? i.url : undefined,
      eventName: typeof i.eventName === 'string' ? i.eventName : undefined,
      hoverScale: typeof i.hoverScale === 'number' ? i.hoverScale : undefined,
    };
  }

  if (isObject(r.edgeCurves)) {
    const ec = r.edgeCurves as Record<string, unknown>;
    const out: Record<number, { cp1: { x: number; y: number }; cp2: { x: number; y: number } }> = {};
    for (const key of Object.keys(ec)) {
      const v = ec[key];
      if (!isObject(v)) continue;
      const vv = v as Record<string, unknown>;
      const cp1 = isObject(vv.cp1) ? (vv.cp1 as Record<string, unknown>) : null;
      const cp2 = isObject(vv.cp2) ? (vv.cp2 as Record<string, unknown>) : null;
      if (!cp1 || !cp2) continue;
      out[Number(key)] = {
        cp1: { x: numberOr(cp1.x, 0), y: numberOr(cp1.y, 0) },
        cp2: { x: numberOr(cp2.x, 0), y: numberOr(cp2.y, 0) },
      };
    }
    section.edgeCurves = out;
  }

  if (isObject(r.arc)) {
    const a = r.arc as Record<string, unknown>;
    section.arc = {
      startAngle: numberOr(a.startAngle, 0),
      endAngle: numberOr(a.endAngle, Math.PI),
      innerRadius: numberOr(a.innerRadius, 80),
      outerRadius: numberOr(a.outerRadius, 140),
    };
  }

  if (childrenRaw) {
    section.children = childrenRaw.map((c, i) => normalizeSection(c, i));
  }

  return section;
}

function normalizeSeat(raw: unknown, index: number): Seat {
  if (!isObject(raw)) throw new ImportError(`Seat ${index} is not an object`);
  const r = raw as Record<string, unknown>;
  const bounds = isObject(r.bounds) ? (r.bounds as Record<string, unknown>) : {};

  return {
    id: stringOr(r.id, `seat-${index}`),
    rowLabel: stringOr(r.rowLabel, ''),
    seatNumber: stringOr(r.seatNumber, String(index + 1)),
    label: stringOr(r.label, `${stringOr(r.rowLabel, '')}${stringOr(r.seatNumber, String(index + 1))}`),
    bounds: {
      x: numberOr(bounds.x, 0),
      y: numberOr(bounds.y, 0),
      width: numberOr(bounds.width, 18),
      height: numberOr(bounds.height, 18),
    },
    state: (stringOr(r.state, 'available') as Seat['state']),
    accessible: boolOr(r.accessible, false),
    customLabel: typeof r.customLabel === 'string' ? r.customLabel : undefined,
  };
}

function normalizeStage(raw: Record<string, unknown>): StageElement {
  const bounds = isObject(raw.bounds) ? (raw.bounds as Record<string, unknown>) : {};
  return {
    id: stringOr(raw.id, 'stage'),
    type: 'stage',
    label: stringOr(raw.label, 'STAGE'),
    fill: stringOr(raw.fill, '#334155'),
    bounds: {
      x: numberOr(bounds.x, 600),
      y: numberOr(bounds.y, 100),
      width: numberOr(bounds.width, 400),
      height: numberOr(bounds.height, 80),
    },
  };
}

function stringOr(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}
function numberOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function boolOr(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function isObject(v: unknown): v is object {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
