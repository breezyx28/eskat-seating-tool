import { nanoid } from 'nanoid';
import type { Section, SectionShape, StageElement, Point } from '@/types';

interface CreateSectionParams {
  type: SectionShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  name?: string;
  zIndex: number;
  points?: Point[];
}

export function createSection(params: CreateSectionParams): Section {
  const {
    type,
    x,
    y,
    width = type === 'circle'
      ? 180
      : type === 'arc'
        ? 320
        : 220,
    height = type === 'circle'
      ? 180
      : type === 'arc'
        ? 180
        : 160,
    name = defaultNameForShape(type),
    zIndex,
    points,
  } = params;

  const section: Section = {
    id: nanoid(),
    type,
    name,
    price: 0,
    currency: '$',
    bounds: { x, y, width, height },
    rotation: 0,
    fill: '#a855f733',
    stroke: '#a855f7',
    strokeWidth: 1,
    opacity: 0.95,
    labelVisible: true,
    seats: [],
    zIndex,
    seatIcon: 'chair',
    points,
  };

  if (type === 'arc') {
    section.arc = {
      startAngle: Math.PI,
      endAngle: 2 * Math.PI,
      innerRadius: 60,
      outerRadius: 140,
    };
  }

  return section;
}

export function createStage(x: number, y: number): StageElement {
  return {
    id: nanoid(),
    type: 'stage',
    label: 'STAGE',
    bounds: { x, y, width: 400, height: 80 },
    fill: '#334155',
  };
}

function defaultNameForShape(type: SectionShape): string {
  switch (type) {
    case 'rectangle':
      return 'New Section';
    case 'circle':
      return 'Center';
    case 'ellipse':
      return 'Ellipse';
    case 'polygon':
      return 'Polygon';
    case 'arc':
      return 'Arc';
    case 'stage':
      return 'Stage';
    default:
      return 'Section';
  }
}
