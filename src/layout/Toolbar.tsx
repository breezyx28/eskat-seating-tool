import {
  ArrowCounterClockwise,
  ArrowClockwise,
  GridFour,
  Magnet,
  FolderOpen,
  FloppyDisk,
  DownloadSimple,
  FilePlus,
  Lock,
  LockOpen,
  ArrowsOutCardinal,
  CursorClick,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { useCanvasStore } from '@/store/canvasStore';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { BrandLogo } from '@/assets/icons/BrandLogo';

interface ToolbarProps {
  onNew?: () => void;
  onOpen?: () => void;
  onSave?: () => void;
  onExportComponent?: () => void;
}

/** Tight divider slot — used between toolbar groups */
function ToolbarDivider() {
  return (
    <span
      aria-hidden
      className="mx-2 h-5 w-px shrink-0"
      style={{ background: 'var(--border)' }}
    />
  );
}

/** Toggle row: icon + switch + lowercase label (no redundant outer chrome) */
function ToolbarToggle({
  checked,
  onChange,
  icon,
  label,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: React.ReactNode;
  label: string;
  title: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className="group flex items-center gap-2 h-8 px-2 rounded-sm transition-colors duration-base ease-soft-spring hover:bg-[var(--bg-panel-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]"
          aria-pressed={checked}
        >
          <span
            className="shrink-0"
            style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {icon}
          </span>
          <Switch checked={checked} onCheckedChange={onChange} />
          <span
            className="text-[11px] font-medium tab-num"
            style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {label}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

export function Toolbar({ onNew, onOpen, onSave, onExportComponent }: ToolbarProps) {
  const zoom = useCanvasStore((s) => s.zoom);
  const gridEnabled = useCanvasStore((s) => s.gridEnabled);
  const snapEnabled = useCanvasStore((s) => s.snapEnabled);
  const toggleGrid = useCanvasStore((s) => s.toggleGrid);
  const toggleSnap = useCanvasStore((s) => s.toggleSnap);
  const canvasLocked = useCanvasStore((s) => s.canvasLocked);
  const toggleCanvasLock = useCanvasStore((s) => s.toggleCanvasLock);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const historyIndex = useCanvasStore((s) => s.historyIndex);
  const history = useCanvasStore((s) => s.history);
  const venueName = useCanvasStore((s) => s.venueData.venue.name);
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <header
      className="flex items-center gap-0 px-3 h-12 shrink-0 border-b"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border)' }}
    >
      {/* Brand mark — triple-arc Eskat glyph painted in the primary accent.
          Doubles as a link back to the landing page. */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/"
            className="group flex items-center gap-2 pr-2 rounded-sm transition-opacity duration-base ease-soft-spring hover:opacity-85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            aria-label="Back to Eskat Seating home"
          >
            <BrandLogo size={22} style={{ color: 'var(--accent)' }} />
            <span
              className="text-[13px] font-medium tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              Eskat
            </span>
            <span className="mono-label mono-label--tight ml-1" style={{ color: 'var(--text-faint)' }}>
              Seating
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>Back to home</TooltipContent>
      </Tooltip>

      <ToolbarDivider />

      {/* Tool select: select (V) / hand (H) — mirrors Figma's single-key
          tool toggles and drives whether left-drag on empty canvas starts a
          marquee or pans the viewport. */}
      <div
        className="flex items-center rounded-sm overflow-hidden"
        style={{ border: '1px solid var(--border)' }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              aria-pressed={activeTool === 'select'}
              className="flex items-center justify-center h-7 w-7 transition-colors duration-base ease-soft-spring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              style={{
                background:
                  activeTool === 'select' ? 'var(--accent-soft)' : 'transparent',
                color:
                  activeTool === 'select' ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <CursorClick size={14} weight={activeTool === 'select' ? 'fill' : 'regular'} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Select tool (V)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setActiveTool('hand')}
              aria-pressed={activeTool === 'hand'}
              className="flex items-center justify-center h-7 w-7 transition-colors duration-base ease-soft-spring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              style={{
                background:
                  activeTool === 'hand' ? 'var(--accent-soft)' : 'transparent',
                color:
                  activeTool === 'hand' ? 'var(--accent)' : 'var(--text-muted)',
                borderLeft: '1px solid var(--border)',
              }}
            >
              <ArrowsOutCardinal size={14} weight={activeTool === 'hand' ? 'fill' : 'regular'} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Hand tool (H)</TooltipContent>
        </Tooltip>
      </div>

      <ToolbarDivider />

      {/* File group */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onNew} aria-label="New">
              <FilePlus size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New (Ctrl+N)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpen} aria-label="Open JSON">
              <FolderOpen size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open JSON (Ctrl+O)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onSave} aria-label="Save JSON">
              <FloppyDisk size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save JSON (Ctrl+S)</TooltipContent>
        </Tooltip>
      </div>

      <ToolbarDivider />

      {/* History group */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUndo}
              onClick={undo}
              aria-label="Undo"
            >
              <ArrowCounterClockwise size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canRedo}
              onClick={redo}
              aria-label="Redo"
            >
              <ArrowClockwise size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
      </div>

      <ToolbarDivider />

      {/* Zoom read-out — fixed width tabular nums */}
      <div className="flex items-center gap-2">
        <span className="mono-label mono-label--tight">Zoom</span>
        <span
          className="text-[11px] font-medium tab-num w-10 text-right"
          style={{ color: 'var(--text-primary)' }}
        >
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <ToolbarDivider />

      {/* Canvas toggles */}
      <div className="flex items-center gap-1">
        <ToolbarToggle
          checked={gridEnabled}
          onChange={toggleGrid}
          icon={<GridFour size={14} />}
          label="Grid"
          title="Toggle grid"
        />
        <ToolbarToggle
          checked={snapEnabled}
          onChange={toggleSnap}
          icon={<Magnet size={14} />}
          label="Snap"
          title="Snap to grid"
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggleCanvasLock}
              aria-pressed={canvasLocked}
              className="flex items-center gap-2 h-8 px-2 rounded-sm transition-colors duration-base ease-soft-spring hover:bg-[var(--bg-panel-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]"
              style={
                canvasLocked
                  ? {
                      background: 'var(--accent-soft)',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--accent)',
                    }
                  : undefined
              }
            >
              {canvasLocked ? <Lock size={14} weight="fill" /> : <LockOpen size={14} />}
              <span
                className="text-[11px] font-medium"
                style={{ color: canvasLocked ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {canvasLocked ? 'Locked' : 'Lock'}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{canvasLocked ? 'Unlock canvas' : 'Lock canvas'} (Ctrl+L)</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1" />

      {/* Venue name — project-mode mono marker */}
      <div className="hidden md:flex items-center gap-2 mr-3">
        <span className="mono-label mono-label--tight">Venue</span>
        <span
          className="text-[12px] font-medium max-w-[200px] truncate"
          style={{ color: 'var(--text-secondary)' }}
          title={venueName}
        >
          {venueName}
        </span>
      </div>

      {/* Primary CTA — the only pill in the toolbar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="brand" size="sm" onClick={onExportComponent}>
            <DownloadSimple size={14} weight="bold" />
            Export component
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export a self-contained SeatMap.tsx</TooltipContent>
      </Tooltip>
    </header>
  );
}
