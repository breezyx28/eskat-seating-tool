// ─── Seat & Section Types ─────────────────────────────────────

export type SeatState = 'available' | 'reserved' | 'disabled';
export type SectionShape =
  | 'rectangle'
  | 'circle'
  | 'polygon'
  | 'ellipse'
  | 'stage'
  | 'arc';
export type SeatIcon = 'chair' | 'chair-simple' | 'circle' | 'square' | 'rounded' | 'custom';

export interface CustomSeatIcon {
  /** Raw sanitised SVG markup, ready for inline rendering. Expected to contain
   *  a root <svg> element with a viewBox attribute so the renderer can scale
   *  it to each seat's bounds. */
  svg: string;
  /** Optional user-facing name shown in the icon picker. */
  name?: string;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Seat {
  id: string;
  rowLabel: string;
  seatNumber: string;
  label: string;
  bounds: Bounds;
  state: SeatState;
  accessible: boolean;
  customLabel?: string;
}

export type PatternType = 'none' | 'dots' | 'grid' | 'stripes' | 'custom';

export interface SectionPattern {
  type: PatternType;
  color?: string;
  size?: number;
  spacing?: number;
  customSvg?: string;
  opacity?: number;
}

export type ClickAction = 'select' | 'drillIn' | 'url' | 'event';

export interface SectionInteractions {
  tooltip?: string;
  clickAction?: ClickAction;
  url?: string;
  eventName?: string;
  hoverScale?: number;
}

export interface ArcSpec {
  startAngle: number; // radians
  endAngle: number; // radians
  innerRadius: number;
  outerRadius: number;
}

export interface EdgeCurve {
  cp1: Point;
  cp2: Point;
}

export interface Section {
  id: string;
  type: SectionShape;
  name: string;
  price: number;
  currency: string;
  bounds: Bounds;
  rotation: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  labelVisible: boolean;
  seats: Seat[];
  points?: Point[]; // for polygon sections
  zIndex: number;
  seatIcon?: SeatIcon;
  customSeatIcon?: CustomSeatIcon;
  cornerRadius?: number;
  pattern?: SectionPattern;
  interactions?: SectionInteractions;
  edgeCurves?: Record<number, EdgeCurve>; // polygon edge index → bezier
  arc?: ArcSpec;
  children?: Section[]; // container — mutually exclusive with seats.length > 0
}

export interface StageElement {
  id: string;
  type: 'stage';
  label: string;
  bounds: Bounds;
  fill: string;
  points?: Point[];
}

export interface VenueData {
  version: string;
  venue: {
    name: string;
    width: number;
    height: number;
    background: string;
  };
  sections: Section[];
  stage?: StageElement;
}

// ─── Store Types ──────────────────────────────────────────────

export type ActiveTool = 'select' | 'hand';

export interface ClipboardPayload {
  /** Sections were copied in their entirety (with seats + children). */
  sections: Section[];
  /** Loose seats were copied without their owning section. The `sectionId`
   *  points at the section they were copied from so paste can re-home them. */
  seats: { sectionId: string; seat: Seat }[];
}

export interface CanvasState {
  venueData: VenueData;
  selectedIds: string[]; // section IDs or seat IDs
  zoom: number;
  panOffset: Point;
  gridEnabled: boolean;
  snapEnabled: boolean;
  gridSize: number;
  history: VenueData[];
  historyIndex: number;
  cursorPosition: Point;
  isDragging: boolean;
  lastSavedAt: number | null;
  dirty: boolean;
  drillPath: string[]; // root-to-active chain of container section IDs
  canvasLocked: boolean; // when true, pan/zoom and edits are disabled on the viewport
  activeTool: ActiveTool;
  clipboard: ClipboardPayload | null;
}

export interface CanvasActions {
  addSection: (section: Section) => void;
  updateSection: (id: string, updates: Partial<Section>) => void;
  updateSectionNoHistory: (id: string, updates: Partial<Section>) => void;
  commitHistory: () => void;
  removeSection: (id: string) => void;
  updateSeat: (sectionId: string, seatId: string, updates: Partial<Seat>) => void;
  updateSeats: (sectionId: string, updater: (seats: Seat[]) => Seat[]) => void;
  setSelectedIds: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  undo: () => void;
  redo: () => void;
  loadVenueData: (data: VenueData) => void;
  setCursorPosition: (pos: Point) => void;
  newCanvas: () => void;
  updateVenue: (updates: Partial<VenueData['venue']>) => void;
  setStage: (stage: StageElement | undefined) => void;
  reorderSection: (id: string, direction: 'up' | 'down') => void;
  setSectionZIndex: (id: string, zIndex: number) => void;
  markSaved: () => void;
  drillInto: (sectionId: string) => void;
  drillUp: () => void;
  drillToRoot: () => void;
  addChildSection: (parentId: string, child: Section) => void;
  convertToContainer: (sectionId: string) => void;
  toggleCanvasLock: () => void;
  setCanvasLocked: (locked: boolean) => void;
  deleteSeats: (seatIds: string[]) => void;
  clearSectionSeats: (sectionId: string) => void;
  scaleSection: (id: string, factor: number, options?: { scaleSeats?: boolean }) => void;
  setActiveTool: (tool: ActiveTool) => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (offset?: Point) => string[];
  nudgeSelection: (dx: number, dy: number) => void;
  uncontainSection: (id: string) => void;
  groupSections: (ids: string[]) => string | null;
  setSectionZIndexToExtreme: (id: string, extreme: 'front' | 'back') => void;
}

// ─── Seat Generation ──────────────────────────────────────────

export interface SeatGenConfig {
  rows: number;
  cols: number;
  rowSpacing: number;
  colSpacing: number;
  seatWidth: number;
  seatHeight: number;
  startRowLabel: string;
  numberDirection: 'ltr' | 'rtl';
  offsetX: number;
  offsetY: number;
  seatIcon?: SeatIcon;
}

// ─── Export Component ─────────────────────────────────────────

export interface SeatMapProps {
  initialSeatStates?: Record<string, SeatState>;
  onSeatSelect?: (seatId: string, seatInfo: SeatInfo) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  readOnly?: boolean;
  className?: string;
  maxSelectable?: number;
  onDrillIn?: (sectionId: string) => void;
  onDrillOut?: () => void;
  initialDrillPath?: string[];
}

export interface SeatInfo {
  id: string;
  label: string;
  rowLabel: string;
  seatNumber: string;
  sectionId: string;
  sectionName: string;
  price: number;
  currency: string;
  state: SeatState;
  accessible: boolean;
}
