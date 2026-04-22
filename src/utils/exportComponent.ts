import type { VenueData } from '@/types';
import { generateComponentSource } from './componentTemplate';

export function exportAsReactComponent(data: VenueData, componentName = 'SeatMap'): string {
  return generateComponentSource(data, componentName);
}

export function downloadReactComponent(data: VenueData, componentName = 'SeatMap') {
  const src = exportAsReactComponent(data, componentName);
  const blob = new Blob([src], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${componentName}.tsx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
