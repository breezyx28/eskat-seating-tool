import type { Section } from '@/types';

interface ArcRendererProps {
  section: Section;
  isSelected?: boolean;
  patternDefs?: string;
  patternFill?: string;
}

/**
 * Renders an arc/annular-sector section as an SVG path. The arc is drawn in
 * the section's local coordinate space, with its center at the middle of the
 * section bounds. Start/end angles are in radians (0 = east, PI/2 = south).
 */
export function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  const sa = startAngle;
  const ea = endAngle;
  const largeArc = Math.abs(ea - sa) > Math.PI ? 1 : 0;
  const sweep = ea > sa ? 1 : 0;

  const x1 = cx + Math.cos(sa) * outerR;
  const y1 = cy + Math.sin(sa) * outerR;
  const x2 = cx + Math.cos(ea) * outerR;
  const y2 = cy + Math.sin(ea) * outerR;
  const x3 = cx + Math.cos(ea) * innerR;
  const y3 = cy + Math.sin(ea) * innerR;
  const x4 = cx + Math.cos(sa) * innerR;
  const y4 = cy + Math.sin(sa) * innerR;

  return [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} ${sweep} ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArc} ${1 - sweep} ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

export function ArcRenderer({ section, isSelected, patternDefs, patternFill }: ArcRendererProps) {
  if (!section.arc) return null;
  const cx = section.bounds.width / 2;
  const cy = section.bounds.height / 2;
  const d = arcPath(
    cx,
    cy,
    section.arc.innerRadius,
    section.arc.outerRadius,
    section.arc.startAngle,
    section.arc.endAngle
  );
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-auto"
      viewBox={`0 0 ${section.bounds.width} ${section.bounds.height}`}
      preserveAspectRatio="none"
    >
      {patternDefs && <defs dangerouslySetInnerHTML={{ __html: patternDefs }} />}
      <path
        d={d}
        fill={section.fill}
        stroke={isSelected ? 'var(--text-primary)' : section.stroke}
        strokeWidth={isSelected ? 1.5 : section.strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      {patternFill && <path d={d} fill={patternFill} />}
    </svg>
  );
}
