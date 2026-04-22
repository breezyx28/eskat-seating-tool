import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string;
  label: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutEntry[];
}

const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl';

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Edit',
    items: [
      { keys: `${MOD}+Z`, label: 'Undo' },
      { keys: `${MOD}+Shift+Z / ${MOD}+Y`, label: 'Redo' },
      { keys: `${MOD}+C`, label: 'Copy' },
      { keys: `${MOD}+X`, label: 'Cut' },
      { keys: `${MOD}+V`, label: 'Paste' },
      { keys: `${MOD}+D`, label: 'Duplicate' },
      { keys: `${MOD}+A`, label: 'Select all' },
      { keys: 'Delete / Backspace', label: 'Delete selection' },
      { keys: 'Escape', label: 'Clear selection / exit mode' },
    ],
  },
  {
    title: 'Arrange',
    items: [
      { keys: '[ / ]', label: 'Send backward / bring forward' },
      { keys: 'Shift+[ / Shift+]', label: 'Send to back / bring to front' },
      { keys: `${MOD}+G`, label: 'Group selection' },
      { keys: `${MOD}+Shift+G`, label: 'Ungroup container' },
      { keys: 'Arrow keys', label: 'Nudge by 1px' },
      { keys: 'Shift+Arrow keys', label: 'Nudge by 10px' },
      { keys: 'F2 / Enter', label: 'Rename selected section' },
      { keys: 'Alt+drag', label: 'Duplicate while dragging' },
    ],
  },
  {
    title: 'View',
    items: [
      { keys: `${MOD}+0`, label: 'Zoom to fit' },
      { keys: `${MOD}+1`, label: 'Zoom to 100%' },
      { keys: `${MOD}++`, label: 'Zoom in' },
      { keys: `${MOD}+-`, label: 'Zoom out' },
      { keys: `${MOD}+Wheel`, label: 'Zoom to cursor' },
      { keys: `${MOD}+L`, label: 'Toggle canvas lock' },
      { keys: `${MOD}+Shift+E`, label: 'Export component' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { keys: 'V', label: 'Select tool' },
      { keys: 'H', label: 'Hand tool' },
      { keys: 'R', label: 'Rectangle section' },
      { keys: 'O', label: 'Ellipse section' },
      { keys: 'P', label: 'Polygon tool' },
    ],
  },
  {
    title: 'Mouse',
    items: [
      { keys: 'Left-drag (empty)', label: 'Marquee select' },
      { keys: 'Alt+Left-drag', label: 'Marquee select seats' },
      { keys: 'H or Space + Left-drag', label: 'Pan canvas' },
      { keys: 'Middle-drag', label: 'Pan canvas' },
      { keys: 'Right-click', label: 'Context menu' },
    ],
  },
  {
    title: 'Help',
    items: [{ keys: 'Shift+?', label: 'Open this cheatsheet' }],
  },
];

export function ShortcutsDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Figma-style shortcuts for faster layout editing. Works anywhere on the canvas (inputs
            still capture typing).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 py-2">
          {GROUPS.map((group) => (
            <section key={group.title} className="space-y-2">
              <h3
                className="mono-label mono-label--tight"
                style={{ color: 'var(--text-muted)' }}
              >
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.keys + item.label}
                    className="flex items-center justify-between gap-3 text-[12px]"
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <kbd
                      className="inline-flex items-center h-[20px] px-1.5 rounded-sm text-[10.5px] font-medium tab-num whitespace-nowrap"
                      style={{
                        background: 'var(--bg-panel-hover)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {item.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
