import type { VenueData } from '@/types';

export interface VenueConfig {
  colors: {
    available: string;
    reserved: string;
    disabled: string;
    selected: string;
    background: string;
    sectionLabel: string;
    accessibility: string;
    marqueeStroke: string;
    marqueeFill: string;
  };
  interaction: {
    minZoom: number;
    maxZoom: number;
    zoomStep: number;
    wheelZoomSpeed: number;
    hoverOutline: boolean;
    marqueeSelect: boolean;
    shiftMultiSelect: boolean;
    drillAnimationMs: number;
    showBreadcrumb: boolean;
    allowEscapeToDrillUp: boolean;
    defaultContainerClick: 'drillIn' | 'select' | 'url' | 'event';
  };
  layout: {
    seatIcon: 'chair' | 'chair-simple' | 'circle' | 'rounded' | 'square';
    sectionBorderRadius: number;
    seatBorderRadius: number;
    showSectionLabels: boolean;
    showPriceBadges: boolean;
  };
}

export const DEFAULT_VENUE_CONFIG: VenueConfig = {
  colors: {
    available: '#a855f7',
    reserved: '#ef4444',
    disabled: '#4b5563',
    selected: '#f59e0b',
    background: '#0f172a',
    sectionLabel: 'rgba(255,255,255,0.95)',
    accessibility: '#0ea5e9',
    marqueeStroke: '#a855f7',
    marqueeFill: 'rgba(168, 85, 247, 0.2)',
  },
  interaction: {
    minZoom: 0.4,
    maxZoom: 4,
    zoomStep: 0.1,
    wheelZoomSpeed: 0.0015,
    hoverOutline: true,
    marqueeSelect: true,
    shiftMultiSelect: true,
    drillAnimationMs: 320,
    showBreadcrumb: true,
    allowEscapeToDrillUp: true,
    defaultContainerClick: 'drillIn',
  },
  layout: {
    seatIcon: 'chair',
    sectionBorderRadius: 6,
    seatBorderRadius: 4,
    showSectionLabels: true,
    showPriceBadges: true,
  },
};

/**
 * Generates a standalone `venue.config.ts` file that integrators can edit.
 * The seat map component imports this config; changes here reflect instantly
 * without regenerating the component.
 */
export function generateConfigSource(config: VenueConfig = DEFAULT_VENUE_CONFIG): string {
  return `/**
 * venue.config.ts — edit this file to theme and tune the seat map.
 * Changes take effect immediately; no regeneration needed.
 */

export type SeatIcon =
  | 'chair'
  | 'chair-simple'
  | 'circle'
  | 'rounded'
  | 'square';

export interface VenueConfig {
  colors: {
    available: string;
    reserved: string;
    disabled: string;
    selected: string;
    background: string;
    sectionLabel: string;
    accessibility: string;
    marqueeStroke: string;
    marqueeFill: string;
  };
  interaction: {
    minZoom: number;
    maxZoom: number;
    zoomStep: number;
    wheelZoomSpeed: number;
    hoverOutline: boolean;
    marqueeSelect: boolean;
    shiftMultiSelect: boolean;
    drillAnimationMs: number;
    showBreadcrumb: boolean;
    allowEscapeToDrillUp: boolean;
    defaultContainerClick: 'drillIn' | 'select' | 'url' | 'event';
  };
  layout: {
    seatIcon: SeatIcon;
    sectionBorderRadius: number;
    seatBorderRadius: number;
    showSectionLabels: boolean;
    showPriceBadges: boolean;
  };
}

export const venueConfig: VenueConfig = ${JSON.stringify(config, null, 2)};

export default venueConfig;
`;
}

export function downloadConfig(config?: VenueConfig) {
  const src = generateConfigSource(config);
  const blob = new Blob([src], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'venue.config.ts';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Derive a default config from the current venue data. For now we use global
 * defaults and the venue background color; per-section colors remain embedded
 * in the generated component.
 */
export function configFromVenueData(data: VenueData): VenueConfig {
  return {
    ...DEFAULT_VENUE_CONFIG,
    colors: {
      ...DEFAULT_VENUE_CONFIG.colors,
      background: data.venue.background,
    },
  };
}
