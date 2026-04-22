import type { SectionPattern } from '@/types';
import { sanitizeSvgFragment } from '@/utils/sanitizeSvg';

export interface RenderedPattern {
  id: string;
  svgDefs: string;
  fill: string; // `url(#pattern-id)` or empty
}

/**
 * Produces inline SVG pattern defs + a fill reference for a section pattern.
 * Works in both the designer and the exported component (output is plain SVG).
 */
export function renderPattern(
  pattern: SectionPattern | undefined,
  sectionId: string
): RenderedPattern {
  if (!pattern || pattern.type === 'none') {
    return { id: '', svgDefs: '', fill: '' };
  }

  const id = `pat-${sectionId}`;
  const color = pattern.color ?? '#ffffff';
  const size = Math.max(2, pattern.size ?? 4);
  const spacing = Math.max(size, pattern.spacing ?? 16);
  const opacity = pattern.opacity ?? 0.35;

  let body = '';
  switch (pattern.type) {
    case 'dots': {
      body = `<circle cx="${spacing / 2}" cy="${spacing / 2}" r="${size / 2}" fill="${color}" fill-opacity="${opacity}" />`;
      break;
    }
    case 'grid': {
      body =
        `<path d="M ${spacing} 0 L 0 0 0 ${spacing}" fill="none" ` +
        `stroke="${color}" stroke-opacity="${opacity}" stroke-width="${Math.max(0.5, size / 4)}" />`;
      break;
    }
    case 'stripes': {
      const stripe = Math.max(2, size);
      body =
        `<rect width="${stripe}" height="${spacing}" fill="${color}" fill-opacity="${opacity}" />`;
      break;
    }
    case 'custom': {
      body = sanitizeSvgFragment(pattern.customSvg ?? '');
      break;
    }
  }

  const svgDefs =
    `<pattern id="${id}" x="0" y="0" width="${spacing}" height="${spacing}" ` +
    `patternUnits="userSpaceOnUse">${body}</pattern>`;

  return { id, svgDefs, fill: `url(#${id})` };
}

export const PATTERN_PRESETS: ReadonlyArray<{
  id: SectionPattern['type'];
  label: string;
}> = [
  { id: 'none', label: 'None' },
  { id: 'dots', label: 'Dots' },
  { id: 'grid', label: 'Grid' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'custom', label: 'Custom SVG' },
];
