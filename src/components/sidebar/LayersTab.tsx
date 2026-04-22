import { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import {
  Rectangle,
  Circle,
  Polygon,
  Wall,
  Eye,
  EyeSlash,
  DotsSixVertical,
  Trash,
  CaretDown,
  CaretRight,
  MoonStars,
  TreeStructure,
  SignIn,
} from '@phosphor-icons/react';
import type { Section } from '@/types';
import { isContainer } from '@/utils/sectionTree';

export function LayersTab() {
  const sections = useCanvasStore((s) => s.venueData.sections);
  const stage = useCanvasStore((s) => s.venueData.stage);
  const setStage = useCanvasStore((s) => s.setStage);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);
  const updateSection = useCanvasStore((s) => s.updateSection);
  const setSectionZIndex = useCanvasStore((s) => s.setSectionZIndex);
  const removeSection = useCanvasStore((s) => s.removeSection);
  const drillInto = useCanvasStore((s) => s.drillInto);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const sorted = [...sections].sort((a, b) => b.zIndex - a.zIndex);

  const reorderTo = (fromId: string, toId: string) => {
    const from = sections.find((s) => s.id === fromId);
    const to = sections.find((s) => s.id === toId);
    if (!from || !to) return;
    setSectionZIndex(fromId, to.zIndex);
  };

  const renderSection = (section: Section, depth: number): React.ReactNode[] => {
    const container = isContainer(section);
    const isOpen = expanded[section.id] ?? depth === 0;
    const childRows: React.ReactNode[] =
      container && isOpen
        ? [...(section.children ?? [])]
            .sort((a, b) => b.zIndex - a.zIndex)
            .flatMap((c) => renderSection(c, depth + 1))
        : [];
    return [
      <LayerRow
        key={section.id}
        id={section.id}
        label={section.name}
        icon={<SectionIcon section={section} />}
        selected={selectedIds.includes(section.id)}
        depth={depth}
        expandable={container}
        expanded={isOpen}
        onToggleExpand={() =>
          setExpanded((e) => ({ ...e, [section.id]: !isOpen }))
        }
        onSelect={(shift) => {
          if (shift) {
            setSelectedIds(
              selectedIds.includes(section.id)
                ? selectedIds.filter((id) => id !== section.id)
                : [...selectedIds, section.id]
            );
          } else {
            setSelectedIds([section.id]);
          }
        }}
        onDoubleClick={() => {
          if (container) drillInto(section.id);
        }}
        onToggleVisible={() =>
          updateSection(section.id, { opacity: section.opacity > 0 ? 0 : 0.95 })
        }
        visible={section.opacity > 0}
        onDelete={() => removeSection(section.id)}
        draggable={depth === 0}
        isDragging={draggingId === section.id}
        isDropTarget={dropTargetId === section.id}
        onDragStart={() => setDraggingId(section.id)}
        onDragEnd={() => {
          setDraggingId(null);
          setDropTargetId(null);
        }}
        onDragOver={(e) => {
          if (depth === 0 && draggingId && draggingId !== section.id) {
            e.preventDefault();
            setDropTargetId(section.id);
          }
        }}
        onDrop={() => {
          if (draggingId && draggingId !== section.id) {
            reorderTo(draggingId, section.id);
          }
          setDraggingId(null);
          setDropTargetId(null);
        }}
        seatCount={container ? undefined : section.seats.length}
        childCount={container ? section.children!.length : undefined}
        fill={section.fill}
      />,
      ...childRows,
    ];
  };

  const totalRows = sorted.length + (stage ? 1 : 0);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="mono-label">Stack</span>
        <span
          className="text-[10px] tab-num"
          style={{ color: 'var(--text-faint)' }}
        >
          {totalRows}
        </span>
      </div>

      <div className="flex flex-col gap-[2px]">
        {stage && (
          <LayerRow
            id={stage.id}
            label={stage.label || 'Stage'}
            icon={<Wall size={13} />}
            selected={selectedIds.includes(stage.id)}
            onSelect={() => setSelectedIds([stage.id])}
            onToggleVisible={() => {}}
            visible
            onDelete={() => setStage(undefined)}
            draggable={false}
            depth={0}
          />
        )}

        {sorted.flatMap((section) => renderSection(section, 0))}
      </div>

      {sorted.length === 0 && !stage && (
        <div
          className="mx-1 p-6 rounded-md text-center text-[11.5px] leading-relaxed"
          style={{
            background: 'var(--bg-panel-raised)',
            border: '1px dashed var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <div className="mono-label mono-label--tight mb-1">Empty</div>
          No sections yet. Drag a shape from the Shapes tab onto the canvas.
        </div>
      )}
    </div>
  );
}

function SectionIcon({ section }: { section: Section }) {
  if (isContainer(section)) return <TreeStructure size={13} />;
  switch (section.type) {
    case 'circle':
    case 'ellipse':
      return <Circle size={13} />;
    case 'polygon':
      return <Polygon size={13} />;
    case 'arc':
      return <MoonStars size={13} />;
    case 'stage':
      return <Wall size={13} />;
    default:
      return <Rectangle size={13} />;
  }
}

interface LayerRowProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: (shift: boolean) => void;
  onToggleVisible: () => void;
  visible: boolean;
  onDelete: () => void;
  depth: number;
  draggable?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  onDoubleClick?: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  seatCount?: number;
  childCount?: number;
  fill?: string;
}

function LayerRow({
  label,
  icon,
  selected,
  onSelect,
  onToggleVisible,
  visible,
  onDelete,
  depth,
  draggable,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onDoubleClick,
  expandable,
  expanded,
  onToggleExpand,
  seatCount,
  childCount,
  fill,
}: LayerRowProps) {
  const bg = selected
    ? 'var(--bg-panel-active)'
    : isDropTarget
      ? 'var(--accent-soft)'
      : 'transparent';

  const borderColor = selected
    ? 'var(--border-emphasis)'
    : isDropTarget
      ? 'var(--accent-border)'
      : 'transparent';

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="flex items-center gap-2 h-7 rounded-sm text-[12px] group transition-colors duration-base ease-soft-spring cursor-pointer"
      style={{
        paddingLeft: 8 + depth * 14,
        paddingRight: 6,
        background: bg,
        border: `1px solid ${borderColor}`,
        opacity: isDragging ? 0.4 : 1,
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.();
      }}
      onMouseEnter={(e) => {
        if (!selected && !isDropTarget)
          (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-panel-hover)';
      }}
      onMouseLeave={(e) => {
        if (!selected && !isDropTarget)
          (e.currentTarget as HTMLDivElement).style.background = 'transparent';
      }}
    >
      {expandable ? (
        <button
          className="shrink-0 h-4 w-4 inline-flex items-center justify-center rounded-sm hover:bg-[var(--bg-panel-active)] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand?.();
          }}
          style={{ color: 'var(--text-muted)' }}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
        </button>
      ) : (
        draggable && (
          <DotsSixVertical
            size={12}
            className="shrink-0 opacity-0 group-hover:opacity-100 cursor-grab transition-opacity"
            style={{ color: 'var(--text-faint)' }}
          />
        )
      )}

      {/* Fill swatch — visual link between the layer row and its on-canvas color */}
      <span
        className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded-sm"
        style={{
          background: fill ? `${fill.length > 7 ? fill : fill + '33'}` : 'var(--bg-panel-active)',
          border: '1px solid var(--border)',
          color: fill ?? 'var(--text-secondary)',
        }}
      >
        {icon}
      </span>

      <span className="flex-1 truncate font-medium">{label}</span>

      {seatCount !== undefined && seatCount > 0 && (
        <span
          className="mono-label mono-label--tight px-1.5 h-4 inline-flex items-center rounded-sm tab-num"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {seatCount}
        </span>
      )}

      {childCount !== undefined && (
        <span
          className="mono-label mono-label--tight px-1.5 h-4 inline-flex items-center rounded-sm tab-num"
          style={{
            background: 'var(--accent-soft)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent)',
          }}
          title="Sub-sections"
        >
          {childCount}
        </span>
      )}

      {expandable && (
        <button
          className="h-5 w-5 inline-flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-80 hover:opacity-100 hover:bg-[var(--bg-panel-active)] transition-[opacity,background-color]"
          onClick={(e) => {
            e.stopPropagation();
            onDoubleClick?.();
          }}
          title="Enter container"
          style={{ color: 'var(--text-secondary)' }}
        >
          <SignIn size={12} />
        </button>
      )}

      <button
        className="h-5 w-5 inline-flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-80 hover:opacity-100 hover:bg-[var(--bg-panel-active)] transition-[opacity,background-color]"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible();
        }}
        title={visible ? 'Hide' : 'Show'}
        style={{ color: visible ? 'var(--text-secondary)' : 'var(--text-muted)' }}
      >
        {visible ? <Eye size={12} /> : <EyeSlash size={12} />}
      </button>

      <button
        className="h-5 w-5 inline-flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-80 hover:opacity-100 hover:bg-[var(--danger-soft)] transition-[opacity,background-color]"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete"
        style={{ color: 'var(--danger)' }}
      >
        <Trash size={12} />
      </button>
    </div>
  );
}
