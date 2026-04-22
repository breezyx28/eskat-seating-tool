import type { VenueData } from '@/types';

const STORAGE_KEY = 'eskat:autosave:v3';

interface AutoSavePayload {
  data: VenueData;
  savedAt: number;
}

export function writeAutoSave(data: VenueData) {
  try {
    const payload: AutoSavePayload = { data, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Auto-save failed:', err);
  }
}

export function readAutoSave(): AutoSavePayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AutoSavePayload;
    if (!parsed?.data?.venue) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearAutoSave() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
