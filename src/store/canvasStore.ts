import { create } from 'zustand';
import { nanoid } from 'nanoid';
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
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

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
  activeTool: 'select',
  clipboard: null,

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

  setActiveTool: (tool) => set({ activeTool: tool }),

  copySelection: () => {
    const state = get();
    if (!state.selectedIds.length) return;
    const selectedSet = new Set(state.selectedIds);
    const sections: Section[] = [];
    const seats: { sectionId: string; seat: Seat }[] = [];
    walkSections(state.venueData.sections, (sec) => {
      if (selectedSet.has(sec.id)) {
        sections.push(JSON.parse(JSON.stringify(sec)) as Section);
        return;
      }
      for (const seat of sec.seats) {
        if (selectedSet.has(seat.id)) {
          seats.push({ sectionId: sec.id, seat: JSON.parse(JSON.stringify(seat)) });
        }
      }
    });
    if (sections.length === 0 && seats.length === 0) return;
    set({ clipboard: { sections, seats } });
  },

  cutSelection: () => {
    const state = get();
    if (!state.selectedIds.length) return;
    state.copySelection();
    const selectedSet = new Set(state.selectedIds);
    const sectionIds: string[] = [];
    const seatIds: string[] = [];
    walkSections(state.venueData.sections, (sec) => {
      if (selectedSet.has(sec.id)) sectionIds.push(sec.id);
      for (const seat of sec.seats) {
        if (selectedSet.has(seat.id)) seatIds.push(seat.id);
      }
    });
    for (const id of sectionIds) state.removeSection(id);
    if (seatIds.length) state.deleteSeats(seatIds);
  },

  pasteClipboard: (offset = { x: 20, y: 20 }) => {
    const state = get();
    const cb = state.clipboard;
    if (!cb || (cb.sections.length === 0 && cb.seats.length === 0)) return [];
    const next = cloneVenue(state.venueData);
    const newIds: string[] = [];

    // Sections — insert into current drill scope, regenerate ids, offset.
    const freshSections = cb.sections.map((s) => reidSection(offsetSection(s, offset.x, offset.y)));
    if (freshSections.length) {
      for (const s of freshSections) newIds.push(s.id);
      if (state.drillPath.length) {
        const parentId = state.drillPath[state.drillPath.length - 1];
        updateInTree(next.sections, parentId, (p) => ({
          ...p,
          seats: [],
          children: [...(p.children ?? []), ...freshSections],
        }));
      } else {
        next.sections.push(...freshSections);
      }
    }

    // Loose seats — paste back into their original owning section if it still
    // exists in the current tree. Skip silently otherwise.
    for (const { sectionId, seat } of cb.seats) {
      const fresh: Seat = {
        ...JSON.parse(JSON.stringify(seat)),
        id: nanoid(),
        bounds: {
          ...seat.bounds,
          x: seat.bounds.x + offset.x,
          y: seat.bounds.y + offset.y,
        },
      };
      const ok = updateInTree(next.sections, sectionId, (sec) => ({
        ...sec,
        seats: [...sec.seats, fresh],
      }));
      if (ok) newIds.push(fresh.id);
    }

    if (!newIds.length) return [];
    set({
      venueData: next,
      ...pushHistory(state, next),
      dirty: true,
      selectedIds: newIds,
    });
    return newIds;
  },

  nudgeSelection: (dx, dy) => {
    const state = get();
    if (!state.selectedIds.length) return;
    if (state.canvasLocked) return;
    const selectedSet = new Set(state.selectedIds);
    const next = cloneVenue(state.venueData);
    let changed = false;

    const walk = (list: Section[]) => {
      for (let i = 0; i < list.length; i++) {
        const sec = list[i];
        if (selectedSet.has(sec.id)) {
          list[i] = {
            ...sec,
            bounds: { ...sec.bounds, x: sec.bounds.x + dx, y: sec.bounds.y + dy },
          };
          changed = true;
        } else if (sec.seats.length) {
          const updatedSeats = sec.seats.map((seat) =>
            selectedSet.has(seat.id)
              ? {
                  ...seat,
                  bounds: { ...seat.bounds, x: seat.bounds.x + dx, y: seat.bounds.y + dy },
                }
              : seat
          );
          if (updatedSeats.some((s, idx) => s !== sec.seats[idx])) {
            list[i] = { ...sec, seats: updatedSeats };
            changed = true;
          }
        }
        if (list[i].children && list[i].children!.length) {
          walk(list[i].children!);
        }
      }
    };
    walk(next.sections);
    if (!changed) return;
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },

  uncontainSection: (id) => {
    const state = get();
    const target = findSectionById(state.venueData, id);
    if (!target || !target.children || target.children.length === 0) return;
    const next = cloneVenue(state.venueData);

    // Find the parent list that contains `id`. If parentId is null, the
    // target lives at root; otherwise it lives inside that parent's children.
    const { parentId, index } = locateInTree(next.sections, id);
    if (index < 0) return;
    const list = parentId
      ? findSectionById({ version: '1.0', venue: { name: '', width: 0, height: 0, background: '' }, sections: next.sections }, parentId)?.children
      : next.sections;
    if (!list) return;
    const [container] = list.splice(index, 1);
    const liftedChildren = (container.children ?? []).map((child) => ({ ...child }));
    list.splice(index, 0, ...liftedChildren);

    set({
      venueData: next,
      ...pushHistory(state, next),
      dirty: true,
      selectedIds: liftedChildren.map((c) => c.id),
      drillPath: reconcileDrillPath(next, state.drillPath),
    });
  },

  groupSections: (ids) => {
    if (!ids.length) return null;
    const state = get();
    const next = cloneVenue(state.venueData);

    // Only group sections that live in the same parent list — mixing levels
    // would violate the tree invariants. We infer the parent of the first id
    // and ignore any selected ids from elsewhere.
    const { parentId, index: firstIdx } = locateInTree(next.sections, ids[0]);
    if (firstIdx < 0) return null;
    const list = parentId
      ? findSectionById({ version: '1.0', venue: { name: '', width: 0, height: 0, background: '' }, sections: next.sections }, parentId)?.children
      : next.sections;
    if (!list) return null;

    const childIdSet = new Set(ids);
    const members: Section[] = [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (childIdSet.has(list[i].id)) {
        members.unshift(list[i]);
        list.splice(i, 1);
      }
    }
    if (members.length === 0) return null;

    // Compute bbox around the members to give the new container its own bounds.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const m of members) {
      if (m.bounds.x < minX) minX = m.bounds.x;
      if (m.bounds.y < minY) minY = m.bounds.y;
      if (m.bounds.x + m.bounds.width > maxX) maxX = m.bounds.x + m.bounds.width;
      if (m.bounds.y + m.bounds.height > maxY) maxY = m.bounds.y + m.bounds.height;
    }
    const maxZ = Math.max(0, ...list.map((s) => s.zIndex), ...members.map((s) => s.zIndex));
    const containerId = nanoid();
    const container: Section = {
      id: containerId,
      type: 'rectangle',
      name: 'Group',
      price: 0,
      currency: 'USD',
      bounds: {
        x: minX === Infinity ? 0 : minX - 10,
        y: minY === Infinity ? 0 : minY - 10,
        width: maxX === -Infinity ? 100 : maxX - minX + 20,
        height: maxY === -Infinity ? 100 : maxY - minY + 20,
      },
      rotation: 0,
      fill: 'transparent',
      stroke: 'rgba(250,250,250,0.3)',
      strokeWidth: 1,
      opacity: 1,
      labelVisible: true,
      seats: [],
      zIndex: maxZ + 1,
      children: members,
    };
    list.splice(firstIdx, 0, container);

    set({
      venueData: next,
      ...pushHistory(state, next),
      dirty: true,
      selectedIds: [containerId],
      drillPath: reconcileDrillPath(next, state.drillPath),
    });
    return containerId;
  },

  setSectionZIndexToExtreme: (id, extreme) => {
    const state = get();
    const next = cloneVenue(state.venueData);
    // Find sibling list containing `id` (root or a parent's children).
    const visit = (list: Section[]): boolean => {
      const idx = list.findIndex((s) => s.id === id);
      if (idx !== -1) {
        const zs = list.map((s) => s.zIndex);
        const maxZ = Math.max(...zs);
        const minZ = Math.min(...zs);
        list[idx] = { ...list[idx], zIndex: extreme === 'front' ? maxZ + 1 : minZ - 1 };
        return true;
      }
      for (const s of list) {
        if (s.children && s.children.length && visit(s.children)) return true;
      }
      return false;
    };
    if (!visit(next.sections)) return;
    set({ venueData: next, ...pushHistory(state, next), dirty: true });
  },
}));

// ─── Non-reactive viewport ref registry ──────────────────────────
// Stored outside the Zustand state so zoom shortcuts can call imperative
// methods without triggering re-renders of every subscriber.
let viewportTransformRef: ReactZoomPanPinchRef | null = null;
export function setTransformRef(ref: ReactZoomPanPinchRef | null): void {
  viewportTransformRef = ref;
}
export function getTransformRef(): ReactZoomPanPinchRef | null {
  return viewportTransformRef;
}

// ─── Internal helpers ─────────────────────────────────────────────

function offsetSection(s: Section, dx: number, dy: number): Section {
  return {
    ...s,
    bounds: { ...s.bounds, x: s.bounds.x + dx, y: s.bounds.y + dy },
  };
}

function reidSection(s: Section): Section {
  const next: Section = {
    ...s,
    id: nanoid(),
    seats: s.seats.map((seat) => ({ ...seat, id: nanoid() })),
  };
  if (s.children && s.children.length) {
    next.children = s.children.map((c) => reidSection(c));
  }
  return next;
}

function locateInTree(
  list: Section[],
  id: string,
  parentId: string | null = null
): { parentId: string | null; index: number } {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { parentId, index: i };
    if (list[i].children && list[i].children!.length) {
      const deep = locateInTree(list[i].children!, id, list[i].id);
      if (deep.index >= 0) return deep;
    }
  }
  return { parentId, index: -1 };
}

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
