import { create } from 'zustand';
import type {
  CanvasState,
  CanvasActions,
  VenueData,
  Section,
  Seat,
  StageElement,
} from '@/types';
import {
  findSectionById,
  removeFromTree,
  updateInTree,
  walkSections,
} from '@/utils/sectionTree';

const HISTORY_LIMIT = 50;

const defaultVenue: VenueData = {
  version: '1.0',
  venue: { name: 'New Venue', width: 1800, height: 1200, background: '#0f172a' },
  sections: [],
};

export function cloneVenue(v: VenueData): VenueData {
  return JSON.parse(JSON.stringify(v));
}

function pushHistory(
  state: CanvasState,
  next: VenueData
): { history: VenueData[]; historyIndex: number } {
  const history = state.history.slice(0, state.historyIndex + 1);
  history.push(cloneVenue(next));
  while (history.length > HISTORY_LIMIT) history.shift();
  return { history, historyIndex: history.length - 1 };
}

// Re-validates the drillPath after mutations — drops any IDs that no longer
// resolve to a container so the canvas doesn't get stuck in a stale view.
function reconcileDrillPath(venue: VenueData, drillPath: string[]): string[] {
  const valid: string[] = [];
  let pool: Section[] = venue.sections;
  for (const id of drillPath) {
    const found = pool.find((s) => s.id === id);
    if (!found || !found.children || !found.children.length) break;
    valid.push(id);
    pool = found.children;
  }
  return valid;
}

export const useCanvasStore = create<CanvasState & CanvasActions>((set, get) => ({
  venueData: cloneVenue(defaultVenue),
  selectedIds: [],
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  gridEnabled: true,
  snapEnabled: true,
  gridSize: 10,
  history: [cloneVenue(defaultVenue)],
  historyIndex: 0,
  cursorPosition: { x: 0, y: 0 },
  isDragging: false,
  lastSavedAt: null,
  dirty: false,
  drillPath: [],
  canvasLocked: false,

  addSection: (section) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    if (state.drillPath.length) {
      const parentId = state.drillPath[state.drillPath.length - 1];
      updateInTree(next.sections, parentId, (p) => ({
        ...p,
        seats: [],
        children: [...(p.children ?? []), section],
      }));
    } else {
      next.sections.push(section);
    }
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  updateSection: (id, updates) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    const ok = updateInTree(next.sections, id, (s) => ({ ...s, ...updates }) as Section);
    if (!ok) return;
    set({
      venueData: next,
      ...pushHistory(state, next),
      dirty: true,
      drillPath: reconcileDrillPath(next, state.drillPath),
    });
  },

  updateSectionNoHistory: (id, updates) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    const ok = updateInTree(next.sections, id, (s) => ({ ...s, ...updates }) as Section);
    if (!ok) return;
    set({ venueData: next, dirty: true });
  },

  commitHistory: () => {
    const state = get();
    set(pushHistory(state, state.venueData));
  },

  removeSection: (id) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    removeFromTree(next.sections, id);
    set({
      venueData: next,
      ...pushHistory(state, next),
      selectedIds: state.selectedIds.filter((sid) => sid !== id),
      dirty: true,
      drillPath: reconcileDrillPath(next, state.drillPath),
    });
  },

  updateSeat: (sectionId, seatId, updates) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    const ok = updateInTree(next.sections, sectionId, (sec) => {
      const idx = sec.seats.findIndex((s) => s.id === seatId);
      if (idx === -1) return sec;
      const nextSeats = sec.seats.slice();
      nextSeats[idx] = { ...nextSeats[idx], ...updates } as Seat;
      return { ...sec, seats: nextSeats };
    });
    if (!ok) return;
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  updateSeats: (sectionId, updater) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    const ok = updateInTree(next.sections, sectionId, (sec) => ({
      ...sec,
      seats: updater(sec.seats),
    }));
    if (!ok) return;
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),
  addToSelection: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id) ? s.selectedIds : [...s.selectedIds, id],
    })),
  removeFromSelection: (id) =>
    set((s) => ({ selectedIds: s.selectedIds.filter((sid) => sid !== id) })),
  clearSelection: () => set({ selectedIds: [] }),
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.1), 5) }),
  setPanOffset: (panOffset) => set({ panOffset }),
  toggleGrid: () => set((s) => ({ gridEnabled: !s.gridEnabled })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),
  setCursorPosition: (pos) => set({ cursorPosition: pos }),

  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const venueData = cloneVenue(history[newIndex]);
    set({
      venueData,
      historyIndex: newIndex,
      dirty: true,
      drillPath: reconcileDrillPath(venueData, get().drillPath),
    });
  },

  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const venueData = cloneVenue(history[newIndex]);
    set({
      venueData,
      historyIndex: newIndex,
      dirty: true,
      drillPath: reconcileDrillPath(venueData, get().drillPath),
    });
  },

  loadVenueData: (data) => {
    const cloned = cloneVenue(data);
    set({
      venueData: cloned,
      history: [cloned],
      historyIndex: 0,
      selectedIds: [],
      dirty: false,
      lastSavedAt: Date.now(),
      drillPath: [],
    });
  },

  newCanvas: () => {
    const fresh = cloneVenue(defaultVenue);
    set({
      venueData: fresh,
      history: [fresh],
      historyIndex: 0,
      selectedIds: [],
      dirty: false,
      lastSavedAt: null,
      drillPath: [],
    });
  },

  updateVenue: (updates) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    next.venue = { ...next.venue, ...updates };
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  setStage: (stage: StageElement | undefined) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    next.stage = stage ? { ...stage } : undefined;
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  reorderSection: (id, direction) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    // Reorder within whichever list the section lives in (root or a container's children)
    const reorderList = (list: Section[]): boolean => {
      const sorted = [...list].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex((s) => s.id === id);
      if (idx === -1) {
        for (const s of list) {
          if (s.children && s.children.length && reorderList(s.children)) return true;
        }
        return false;
      }
      const target = direction === 'up' ? idx + 1 : idx - 1;
      if (target < 0 || target >= sorted.length) return true;
      const tmpZ = sorted[idx].zIndex;
      const a = list.find((s) => s.id === sorted[idx].id)!;
      const b = list.find((s) => s.id === sorted[target].id)!;
      a.zIndex = b.zIndex;
      b.zIndex = tmpZ;
      return true;
    };
    reorderList(next.sections);
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  setSectionZIndex: (id, zIndex) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    updateInTree(next.sections, id, (s) => ({ ...s, zIndex }));
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  markSaved: () => set({ lastSavedAt: Date.now(), dirty: false }),

  drillInto: (sectionId) => {
    const state = get();
    const target = findSectionById(state.venueData, sectionId);
    if (!target || !target.children || !target.children.length) return;
    set({
      drillPath: [...state.drillPath, sectionId],
      selectedIds: [],
    });
  },

  drillUp: () => {
    const state = get();
    if (!state.drillPath.length) return;
    set({
      drillPath: state.drillPath.slice(0, -1),
      selectedIds: [],
    });
  },

  drillToRoot: () => set({ drillPath: [], selectedIds: [] }),

  addChildSection: (parentId, child) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    updateInTree(next.sections, parentId, (p) => ({
      ...p,
      seats: [],
      children: [...(p.children ?? []), child],
    }));
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  convertToContainer: (sectionId) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    updateInTree(next.sections, sectionId, (s) => ({
      ...s,
      seats: [],
      children: s.children && s.children.length ? s.children : [],
    }));
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  toggleCanvasLock: () => set((s) => ({ canvasLocked: !s.canvasLocked })),
  setCanvasLocked: (locked) => set({ canvasLocked: locked }),

  deleteSeats: (seatIds) => {
    if (!seatIds.length) return;
    const state = get();
    const next = cloneVenue(state.venueData);
    const ids = new Set(seatIds);
    // Walk every section (including nested containers) and strip out any
    // seats whose id matches. We mutate in place because `next` is already a
    // deep clone of the store state.
    const stripSeats = (list: Section[]) => {
      for (const sec of list) {
        if (sec.seats.length) {
          const kept = sec.seats.filter((seat) => !ids.has(seat.id));
          if (kept.length !== sec.seats.length) sec.seats = kept;
        }
        if (sec.children && sec.children.length) stripSeats(sec.children);
      }
    };
    stripSeats(next.sections);
    set({
      venueData: next,
      ...pushHistory(state, next),
      dirty: true,
      selectedIds: state.selectedIds.filter((sid) => !ids.has(sid)),
    });
  },

  clearSectionSeats: (sectionId) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    const ok = updateInTree(next.sections, sectionId, (s) => ({ ...s, seats: [] }));
    if (!ok) return;
    const clearedIds = new Set<string>();
    const target = findSectionById(state.venueData, sectionId);
    if (target) for (const seat of target.seats) clearedIds.add(seat.id);
    set({
      venueData: next,
      ...pushHistory(state, next),
      dirty: true,
      selectedIds: state.selectedIds.filter((sid) => !clearedIds.has(sid)),
    });
  },

  scaleSection: (id, factor, options) => {
    if (!isFinite(factor) || factor <= 0 || factor === 1) return;
    const state = get();
    const next = cloneVenue(state.venueData);
    const ok = updateInTree(next.sections, id, (s) =>
      scaleSectionInPlace(s, factor, options?.scaleSeats ?? true)
    );
    if (!ok) return;
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },
}));

// ─── Scale helper ────────────────────────────────────────────────
// Scales a section and its descendants around its own geometric centre. The
// centre-anchored scale preserves the visual focus the user clicked on: a
// circle grows outward instead of drifting toward the top-left corner.
function scaleSectionInPlace(section: Section, factor: number, scaleSeats: boolean): Section {
  const cx = section.bounds.x + section.bounds.width / 2;
  const cy = section.bounds.y + section.bounds.height / 2;
  const newW = section.bounds.width * factor;
  const newH = section.bounds.height * factor;
  const next: Section = {
    ...section,
    bounds: {
      x: cx - newW / 2,
      y: cy - newH / 2,
      width: newW,
      height: newH,
    },
  };

  if (section.points && section.points.length) {
    next.points = section.points.map((p) => ({ x: p.x * factor, y: p.y * factor }));
  }
  if (section.edgeCurves) {
    const scaled: typeof section.edgeCurves = {};
    for (const [key, curve] of Object.entries(section.edgeCurves)) {
      scaled[Number(key)] = {
        cp1: { x: curve.cp1.x * factor, y: curve.cp1.y * factor },
        cp2: { x: curve.cp2.x * factor, y: curve.cp2.y * factor },
      };
    }
    next.edgeCurves = scaled;
  }
  if (section.arc) {
    next.arc = {
      ...section.arc,
      innerRadius: section.arc.innerRadius * factor,
      outerRadius: section.arc.outerRadius * factor,
    };
  }
  if (scaleSeats && section.seats.length) {
    next.seats = section.seats.map((seat) => ({
      ...seat,
      bounds: {
        x: seat.bounds.x * factor,
        y: seat.bounds.y * factor,
        width: seat.bounds.width * factor,
        height: seat.bounds.height * factor,
      },
    }));
  }
  if (section.children && section.children.length) {
    // Containers hold children whose `bounds` are in the same world frame as
    // the container itself. To keep the visual layout identical we re-anchor
    // each child around the same parent centre.
    next.children = section.children.map((child) =>
      scaleChildAround(child, cx, cy, factor, scaleSeats)
    );
  }
  return next;
}

function scaleChildAround(
  section: Section,
  cx: number,
  cy: number,
  factor: number,
  scaleSeats: boolean
): Section {
  const childCx = section.bounds.x + section.bounds.width / 2;
  const childCy = section.bounds.y + section.bounds.height / 2;
  const newCx = cx + (childCx - cx) * factor;
  const newCy = cy + (childCy - cy) * factor;
  const offsetX = newCx - childCx;
  const offsetY = newCy - childCy;
  // Offset the child, then scale it around its own (offset) centre.
  const translated: Section = {
    ...section,
    bounds: {
      ...section.bounds,
      x: section.bounds.x + offsetX,
      y: section.bounds.y + offsetY,
    },
  };
  return scaleSectionInPlace(translated, factor, scaleSeats);
}

// Silence "unused" lint: walkSections is re-exported for convenience
// so callers don't have to import both modules.
export { walkSections };
