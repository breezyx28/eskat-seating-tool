# Eskat — Seating Design Tool

A Figma-like visual designer for building interactive seat maps. Draw venues with
rectangles, circles, and polygons, auto-generate rows of seats, then export a
**zero-dependency, self-contained React component** that you can drop straight into
a ticket-buying page.

---

## Features

- **Infinite canvas** with smooth pan/zoom (`react-zoom-pan-pinch`), grid, snap-to-grid, and alignment guides
- **Shapes**: rectangle, circle, ellipse, polygon (click-to-draw), arc / curved rows, and stage elements
- **Shape customisation** — corner radius, pattern fills (dots, grid, stripes, custom SVG), and per-shape interaction rules (tooltip, click action, hover scale)
- **Bezier edges** — drag any polygon edge into a cubic bezier curve via the built-in polygon editor
- **Nested venues** — promote any section into a container and drill in to reveal child sections (e.g. a cinema complex → individual halls → seats). Breadcrumb navigation and `Esc` to go back
- **Auto seat generation** — grid mode for rectangles/polygons, concentric-arc mode for arc sections, with live preview
- **Fit-to-shape seats** — the seat generator can clip rows to the exact silhouette of a section so circular, elliptical, polygonal, and Bezier-edged sections look pixel-accurate without seats spilling over the border
- **Canvas lock** — freeze pan / zoom / drag / marquee with a single toolbar toggle or `Ctrl/Cmd + L` so large layouts can be reviewed without accidental edits
- **Custom seat icons** — upload your own SVG (sanitised) or PNG per section to override the built-in chair / circle / square icons, also honoured in the exported component
- **Floating quick-actions bar** — selecting a single section pops a mini toolbar with rename, duplicate, rotate ±15°, scale ±10%, clear seats, delete, and an overflow menu for reorder / convert-to-container / enter / generate / properties
- **Multi-seat selection hotkeys** — `Shift` / `Ctrl` / `Cmd` click to toggle individual seats, `Alt` click to grab a whole row, and `Alt`-drag marquee to lasso seats across any depth
- **Delete seats bound to a section** — bulk delete from the floating bar, context menu, sidebar button, or `Delete` / `Backspace`, plus a one-click "Clear all seats" that leaves the section intact
- **Scale selected shapes** — ±10% buttons on the floating bar and sidebar, plus `Ctrl/Cmd + Shift + =` / `Ctrl/Cmd + Shift + -` hotkeys; works recursively on container children and their seats
- **Multi-select** via shift-click and marquee (marquee honours the active drill level)
- **Property inspector** for venue, section, seat, stage, pattern, interactions, and multi-select
- **Layer panel** with tree view, reordering, visibility, and z-index control
- **Templates** — Concert, Stadium, Theatre, Arena, and a hierarchical Cinema Complex (hundreds to thousands of seats)
- **Persistence** — JSON import/export, Ctrl+Z/Ctrl+Y undo/redo, localStorage auto-save (schema `v3`)
- **Export as React component** — generates a self-contained `SeatMap.tsx` with zero external deps, supports nested drill-in, patterns, arcs, interactions, and custom seat icons out of the box, plus an optional `venue.config.ts` sidecar for integrator-editable theming
- **A11y** — ARIA labels, keyboard activation (Enter/Space), tab navigation, `Esc` for drill-up, role="application" on the viewport

---

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) + [Vite](https://vitejs.dev/) + React 18/19
- **Language**: TypeScript (strict mode)
- **State**: [Zustand](https://zustand-demo.pmnd.rs/) (with history capped at 50 snapshots)
- **Styling**: Tailwind CSS v3 + CSS variables (dark theme)
- **UI primitives**: [shadcn/ui](https://ui.shadcn.com/) + Radix
- **Icons**: Phosphor Icons
- **Canvas**: `react-zoom-pan-pinch`
- **IDs**: `nanoid`

---

## Getting Started

```bash
# Install
bun install

# Dev server (http://localhost:5173)
bun dev

# Type-check
bun x tsc --noEmit -p tsconfig.app.json

# Production build
bun run build

# Preview the build
bun run preview
```

---

## Keyboard Shortcuts

| Action                        | Shortcut                                       |
| ----------------------------- | ---------------------------------------------- |
| Undo                          | `Ctrl/Cmd + Z`                                 |
| Redo                          | `Ctrl/Cmd + Shift + Z`                         |
| Save JSON                     | `Ctrl/Cmd + S`                                 |
| Select all sections           | `Ctrl/Cmd + A`                                 |
| Delete selection              | `Delete` / `Backspace`                         |
| Deselect                      | `Escape`                                       |
| Lock / unlock canvas          | `Ctrl/Cmd + L`                                 |
| Scale selection up / down 10% | `Ctrl/Cmd + Shift + =` / `Ctrl/Cmd + Shift + -` |
| Pan canvas                    | Hold `Space` + drag                            |
| Multi-select sections         | `Shift` + click / drag                         |
| Toggle seat in selection      | `Shift` / `Ctrl` / `Cmd` + click a seat        |
| Select whole seat row         | `Alt` + click a seat                           |
| Marquee-select seats          | `Alt` + drag on canvas                         |
| Finish polygon                | `Enter` or double-click                        |
| Cancel polygon                | `Escape`                                       |
| Enter container               | Double-click a container                       |
| Drill up one level            | `Escape` (when drilled)                        |

---

## Using the Exported Component

After designing your venue, click **Export → Export as React Component** to download
two files:

- `SeatMap.tsx` — the self-contained component (React only, no other deps)
- `venue.config.ts` — optional sidecar for theming and interaction tuning

### Installation into your app

Drop both files into your project (e.g. `src/components/SeatMap/`) and use:

```tsx
import SeatMap from './components/SeatMap/SeatMap';

export default function BookingPage() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <SeatMap
        maxSelectable={6}
        onSelectionChange={(ids) => console.log('Selected seats:', ids)}
        onSeatSelect={(id, info) =>
          console.log(`Clicked ${info.sectionName} ${info.label} — ${info.currency}${info.price}`)
        }
      />
    </div>
  );
}
```

### Props

| Prop                 | Type                                                   | Default     | Notes                                                 |
| -------------------- | ------------------------------------------------------ | ----------- | ----------------------------------------------------- |
| `initialSeatStates`  | `Record<string, 'available'\|'reserved'\|'disabled'>` | `{}`        | Override per-seat state at mount time                 |
| `onSeatSelect`       | `(seatId, info) => void`                               | —           | Fires each time a seat is clicked                     |
| `onSelectionChange`  | `(selectedIds: string[]) => void`                      | —           | Fires with the full selection array                   |
| `readOnly`           | `boolean`                                              | `false`     | Disable all interaction                               |
| `maxSelectable`      | `number`                                               | `Infinity`  | Cap how many seats can be picked at once              |
| `initialDrillPath`   | `string[]`                                             | `[]`        | Start the viewer already drilled into a nested path   |
| `onDrillIn`          | `(sectionId, path) => void`                            | —           | Fires whenever the viewer drills into a container     |
| `onDrillOut`         | `(path) => void`                                       | —           | Fires whenever the viewer drills up                   |
| `className`          | `string`                                               | —           | Applied to the outer viewport                         |
| `style`              | `React.CSSProperties`                                  | —           | Inline styles on the viewport                         |

### Tuning the exported component

Open the generated file and edit the top-of-file `SEAT_CONFIG` block:

```ts
const SEAT_CONFIG = {
  colors: {
    available: '#a855f7',
    reserved:  '#ef4444',
    disabled:  '#4b5563',
    selected:  '#f59e0b',
    background: '#0f172a',
    /* … */
  },
  interaction: {
    minZoom: 0.4,
    maxZoom: 4,
    wheelZoomSpeed: 0.0015,
    marqueeSelect: true,
    shiftMultiSelect: true,
    drillAnimationMs: 350,
    showBreadcrumb: true,
    allowEscapeToDrillUp: true,
    defaultContainerClick: 'drillIn',
  },
  layout: {
    seatIcon: 'chair',
    showSectionLabels: true,
    showPriceBadges: true,
  },
} as const;
```

No rebuild of the designer is needed — the exported file is plain TSX.

---

## Project Structure

```
src/
  assets/icons/          Inline SVG icon library (chair, wheelchair, etc.)
  components/
    canvas/              Canvas viewport, sections, seats, context menus
    dialogs/             SeatGenerationDialog, ExportComponentDialog, ConfirmDialog
    sidebar/             Left (shapes/templates/layers) + right (property inspector)
    ui/                  shadcn/ui primitives
  hooks/                 useSnapToGrid, useAlignmentGuides, useKeyboardShortcuts, usePolygonDraw
  layout/                Toolbar, StatusBar
  store/                 Zustand store with history
  templates/             concert.json, stadium.json, theatre.json, arena.json, cinema-complex.json
  types/                 Shared TypeScript types
  utils/                 Seat generation, JSON I/O, auto-save, component/config templates

scripts/buildTemplates.ts  Regenerates the 5 bundled templates
```

---

## Data Format

The designer round-trips a simple `VenueData` JSON shape:

```ts
interface VenueData {
  version: '1.0';
  venue: { name: string; width: number; height: number; background: string };
  sections: Section[];
  stage?: StageElement;
}
```

Full types live in `src/types/index.ts`. Any valid `VenueData` can be imported via
**File → Open JSON** or passed to `loadVenueData(data)` on the store.

---

## Regenerating Templates

The five bundled templates are generated from `scripts/buildTemplates.ts`:

```bash
bun scripts/buildTemplates.ts
```

Edit the script to tweak seat counts, radii, prices, colors, etc., then re-run to
overwrite `src/templates/*.json`.

---

## License

MIT
