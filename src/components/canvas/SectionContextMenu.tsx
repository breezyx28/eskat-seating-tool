import { useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { useCanvasStore } from '@/store/canvasStore';
import {
  Trash,
  PencilSimple,
  Rows,
  Gear,
  Copy,
  ArrowUp,
  ArrowDown,
  TreeStructure,
  SignIn,
  Plus,
  Broom,
} from '@phosphor-icons/react';
import { findSectionById, isContainer } from '@/utils/sectionTree';
import { createSection } from '@/utils/createSection';

interface Props {
  sectionId: string;
  position: { x: number; y: number };
  onClose: () => void;
  onGenerateSeats?: () => void;
  onRename?: () => void;
  onProperties?: () => void;
}

type MenuItem =
  | {
      divider: true;
    }
  | {
      icon: React.ReactNode;
      label: string;
      action: () => void;
      danger?: boolean;
      shortcut?: string;
    };

export function SectionContextMenu({
  sectionId,
  position,
  onClose,
  onGenerateSeats,
  onRename,
  onProperties,
}: Props) {
  const removeSection = useCanvasStore((s) => s.removeSection);
  const reorderSection = useCanvasStore((s) => s.reorderSection);
  const addSection = useCanvasStore((s) => s.addSection);
  const venueData = useCanvasStore((s) => s.venueData);
  const convertToContainer = useCanvasStore((s) => s.convertToContainer);
  const addChildSection = useCanvasStore((s) => s.addChildSection);
  const drillInto = useCanvasStore((s) => s.drillInto);
  const clearSectionSeats = useCanvasStore((s) => s.clearSectionSeats);

  const section = findSectionById(venueData, sectionId);
  const container = section ? isContainer(section) : false;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', key);
    };
  }, [onClose]);

  const items: MenuItem[] = [
    {
      icon: <PencilSimple size={14} />,
      label: 'Rename',
      action: () => {
        onRename?.();
        onClose();
      },
    },
    ...(!container
      ? [
          {
            icon: <Rows size={14} />,
            label: 'Generate Seats…',
            action: () => {
              onGenerateSeats?.();
              onClose();
            },
          } as MenuItem,
        ]
      : []),
    {
      icon: <Gear size={14} />,
      label: 'Properties',
      action: () => {
        onProperties?.();
        onClose();
      },
    },
    { divider: true },
    ...(container
      ? ([
          {
            icon: <SignIn size={14} />,
            label: 'Enter container',
            action: () => {
              drillInto(sectionId);
              onClose();
            },
          },
          {
            icon: <Plus size={14} />,
            label: 'Add sub-section',
            action: () => {
              const sec = findSectionById(venueData, sectionId);
              if (!sec) return;
              const child = createSection({
                type: 'rectangle',
                x: 40,
                y: 40,
                width: 180,
                height: 120,
                zIndex: (sec.children?.length ?? 0) + 1,
              });
              child.id = nanoid();
              child.name = `Sub-section ${(sec.children?.length ?? 0) + 1}`;
              addChildSection(sectionId, child);
              onClose();
            },
          },
        ] as MenuItem[])
      : ([
          {
            icon: <TreeStructure size={14} />,
            label: 'Convert to container',
            action: () => {
              convertToContainer(sectionId);
              onClose();
            },
          },
        ] as MenuItem[])),
    { divider: true },
    {
      icon: <Copy size={14} />,
      label: 'Duplicate',
      action: () => {
        const sec = venueData.sections.find((s) => s.id === sectionId);
        if (!sec) return;
        const copy = JSON.parse(JSON.stringify(sec));
        copy.id = `${sec.id}-copy-${Date.now().toString(36)}`;
        copy.name = `${sec.name} copy`;
        copy.bounds.x += 20;
        copy.bounds.y += 20;
        copy.zIndex = Math.max(0, ...venueData.sections.map((s) => s.zIndex)) + 1;
        addSection(copy);
        onClose();
      },
    },
    {
      icon: <ArrowUp size={14} />,
      label: 'Bring forward',
      action: () => {
        reorderSection(sectionId, 'up');
        onClose();
      },
    },
    {
      icon: <ArrowDown size={14} />,
      label: 'Send backward',
      action: () => {
        reorderSection(sectionId, 'down');
        onClose();
      },
    },
    { divider: true },
    ...(!container && section && section.seats.length > 0
      ? ([
          {
            icon: <Broom size={14} />,
            label: `Clear ${section.seats.length} seats`,
            action: () => {
              clearSectionSeats(sectionId);
              onClose();
            },
          },
        ] as MenuItem[])
      : []),
    {
      icon: <Trash size={14} />,
      label: 'Delete',
      action: () => {
        removeSection(sectionId);
        onClose();
      },
      danger: true,
      shortcut: 'Del',
    },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-md py-1 min-w-[200px] animate-fade-in"
      style={{
        left: position.x,
        top: position.y,
        background: 'var(--bg-panel-raised)',
        border: '1px solid var(--border-strong)',
      }}
    >
      {items.map((item, i) =>
        'divider' in item ? (
          <div
            key={i}
            className="my-1"
            style={{ height: 1, background: 'var(--border)' }}
          />
        ) : (
          <button
            key={i}
            className="flex items-center gap-2.5 w-full px-3 py-[7px] text-[12px] transition-colors text-left focus-visible:outline-none"
            style={{
              color: item.danger ? 'var(--danger)' : 'var(--text-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = item.danger
                ? 'var(--danger-soft)'
                : 'var(--bg-panel-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            onClick={item.action}
          >
            <span
              style={{
                color: item.danger ? 'var(--danger)' : 'var(--text-muted)',
                display: 'inline-flex',
              }}
            >
              {item.icon}
            </span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span
                className="mono-label mono-label--tight"
                style={{ color: 'var(--text-faint)' }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        )
      )}
    </div>
  );
}
