import { useEffect } from 'react';

export interface ShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onSave?: () => void;
  onOpen?: () => void;
  onNew?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onDuplicate?: () => void;
  onSelectAll?: () => void;
  onExport?: () => void;
  onToggleLock?: () => void;
  onScaleUp?: () => void;
  onScaleDown?: () => void;
}

/**
 * Global keyboard shortcut hook. Ignores events inside editable inputs.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.shiftKey && (e.key === 'Z' || e.key === 'z')) {
        e.preventDefault();
        handlers.onRedo?.();
      } else if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        handlers.onUndo?.();
      } else if (mod && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        handlers.onExport?.();
      } else if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handlers.onSave?.();
      } else if (mod && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        handlers.onOpen?.();
      } else if (mod && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        handlers.onNew?.();
      } else if (mod && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handlers.onDuplicate?.();
      } else if (mod && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        handlers.onSelectAll?.();
      } else if (mod && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handlers.onToggleLock?.();
      } else if (mod && e.shiftKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handlers.onScaleUp?.();
      } else if (mod && e.shiftKey && (e.key === '_' || e.key === '-')) {
        e.preventDefault();
        handlers.onScaleDown?.();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handlers.onDelete?.();
      } else if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers]);
}
