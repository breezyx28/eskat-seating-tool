import { useState } from 'react';
import { nanoid } from 'nanoid';
import {
  Copy,
  ArrowClockwise,
  ArrowCounterClockwise,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Trash,
  PencilSimple,
  DotsThreeOutline,
  Rows,
  TreeStructure,
  SignIn,
  ArrowUp,
  ArrowDown,
  Gear,
  Broom,
} from '@phosphor-icons/react';
import type { Section } from '@/types';
import { useCanvasStore } from '@/store/canvasStore';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isContainer } from '@/utils/sectionTree';

interface Props {
  section: Section;
  onRename?: () => void;
  onProperties?: () => void;
  onRequestClearSeats?: () => void;
}

/**
 * Floating quick-actions toolbar rendered above a selected section. Uses
 * `transform: scale(1/zoom)` so the chip bar keeps a fixed screen size
 * regardless of how far the user has zoomed in/out — otherwise the bar would
 * either shrink into invisibility or balloon out of the viewport.
 */
export function SectionQuickActions({
  section,
  onRename,
  onProperties,
  onRequestClearSeats,
}: Props) {
  const zoom = useCanvasStore((s) => s.zoom);
  const removeSection = useCanvasStore((s) => s.removeSection);
  const updateSection = useCanvasStore((s) => s.updateSection);
  const addSection = useCanvasStore((s) => s.addSection);
  const reorderSection = useCanvasStore((s) => s.reorderSection);
  const scaleSection = useCanvasStore((s) => s.scaleSection);
  const convertToContainer = useCanvasStore((s) => s.convertToContainer);
  const drillInto = useCanvasStore((s) => s.drillInto);

  const [showOverflow, setShowOverflow] = useState(false);
  const container = isContainer(section);

  const inverseScale = 1 / Math.max(0.1, zoom);

  const handleDuplicate = () => {
    const copy: Section = JSON.parse(JSON.stringify(section));
    copy.id = nanoid();
    copy.name = `${section.name} copy`;
    copy.bounds.x += 20;
    copy.bounds.y += 20;
    // regenerate seat ids so they stay unique
    copy.seats = copy.seats.map((s) => ({ ...s, id: nanoid() }));
    addSection(copy);
  };

  const handleRotate = (delta: number) => {
    updateSection(section.id, { rotation: (section.rotation + delta) % 360 });
  };

  // The bar sits 12 screen-pixels above the top of the section. The outer
  // wrapper is in section-local coords, so we translate in those units then
  // undo zoom via scale.
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: 0,
        transform: `translate(-50%, -100%) scale(${inverseScale})`,
        transformOrigin: 'bottom center',
        paddingBottom: 8,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div
        className="pointer-events-auto flex items-center gap-[2px] px-[4px] py-[4px] rounded-pill whitespace-nowrap animate-fade-in"
        style={{
          background: 'rgba(23, 23, 23, 0.92)',
          border: '1px solid var(--border-strong)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <Chip label="Rename" onClick={onRename} icon={<PencilSimple size={13} />} />
        <Chip label="Duplicate" onClick={handleDuplicate} icon={<Copy size={13} />} />
        <Divider />
        <Chip
          label="Rotate -15°"
          onClick={() => handleRotate(-15)}
          icon={<ArrowCounterClockwise size={13} />}
        />
        <Chip
          label="Rotate +15°"
          onClick={() => handleRotate(15)}
          icon={<ArrowClockwise size={13} />}
        />
        <Divider />
        <Chip
          label="Scale down 10%"
          onClick={() => scaleSection(section.id, 1 / 1.1)}
          icon={<MagnifyingGlassMinus size={13} />}
        />
        <Chip
          label="Scale up 10%"
          onClick={() => scaleSection(section.id, 1.1)}
          icon={<MagnifyingGlassPlus size={13} />}
        />
        {!container && section.seats.length > 0 && (
          <>
            <Divider />
            <Chip
              label={`Clear ${section.seats.length} seats`}
              onClick={onRequestClearSeats}
              icon={<Broom size={13} />}
            />
          </>
        )}
        <Divider />
        <div className="relative">
          <Chip
            label="More"
            onClick={() => setShowOverflow((v) => !v)}
            icon={<DotsThreeOutline size={13} />}
            active={showOverflow}
          />
          {showOverflow && (
            <div
              className="absolute top-full right-0 mt-1 rounded-md py-1 min-w-[200px] z-10 animate-fade-in"
              style={{
                background: 'var(--bg-panel-raised)',
                border: '1px solid var(--border-strong)',
              }}
            >
              <OverflowItem
                icon={<ArrowUp size={13} />}
                label="Bring forward"
                onClick={() => {
                  reorderSection(section.id, 'up');
                  setShowOverflow(false);
                }}
              />
              <OverflowItem
                icon={<ArrowDown size={13} />}
                label="Send backward"
                onClick={() => {
                  reorderSection(section.id, 'down');
                  setShowOverflow(false);
                }}
              />
              {container ? (
                <OverflowItem
                  icon={<SignIn size={13} />}
                  label="Enter container"
                  onClick={() => {
                    drillInto(section.id);
                    setShowOverflow(false);
                  }}
                />
              ) : (
                <OverflowItem
                  icon={<TreeStructure size={13} />}
                  label="Convert to container"
                  onClick={() => {
                    convertToContainer(section.id);
                    setShowOverflow(false);
                  }}
                />
              )}
              {!container && (
                <OverflowItem
                  icon={<Rows size={13} />}
                  label="Generate seats…"
                  onClick={() => {
                    onProperties?.();
                    setShowOverflow(false);
                  }}
                  hint="Open in sidebar"
                />
              )}
              <OverflowItem
                icon={<Gear size={13} />}
                label="Properties"
                onClick={() => {
                  onProperties?.();
                  setShowOverflow(false);
                }}
              />
            </div>
          )}
        </div>
        <Divider />
        <Chip
          label="Delete"
          onClick={() => removeSection(section.id)}
          icon={<Trash size={13} />}
          danger
        />
      </div>
    </div>
  );
}

function Chip({
  label,
  onClick,
  icon,
  danger,
  active,
}: {
  label: string;
  onClick?: () => void;
  icon: React.ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="flex items-center justify-center h-[26px] w-[26px] rounded-full transition-[background-color,color,transform] duration-base ease-soft-spring active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]"
          style={{
            color: danger
              ? 'var(--danger)'
              : active
                ? 'var(--accent)'
                : 'var(--text-secondary)',
            background: active ? 'var(--accent-soft)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (!active && !danger) {
              e.currentTarget.style.background = 'var(--bg-panel-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
            if (danger) {
              e.currentTarget.style.background = 'var(--danger-soft)';
            }
          }}
          onMouseLeave={(e) => {
            if (!active) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-secondary)';
            }
          }}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return (
    <div className="w-px h-[14px] mx-[2px]" style={{ background: 'var(--border-strong)' }} />
  );
}

function OverflowItem({
  icon,
  label,
  onClick,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-3 py-[7px] text-[12px] transition-colors text-left focus-visible:outline-none focus-visible:bg-[var(--bg-panel-hover)]"
      style={{ color: 'var(--text-primary)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-panel-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && (
        <span
          className="text-[10px] mono-label mono-label--tight"
          style={{ color: 'var(--text-faint)' }}
        >
          {hint}
        </span>
      )}
    </button>
  );
}
