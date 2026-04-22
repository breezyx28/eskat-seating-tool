import type { VenueData } from '@/types';

/**
 * Serialize VenueData to a formatted JSON string.
 */
export function serializeVenueData(data: VenueData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger a browser download of a VenueData as JSON.
 */
export function downloadVenueJson(data: VenueData) {
  const text = serializeVenueData(data);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(data.venue.name || 'venue')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'venue';
}
