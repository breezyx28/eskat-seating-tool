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
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onNudge?: (dx: number, dy: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  onZoomActual?: () => void;
  onSendBackward?: () => void;
  onBringForward?: () => void;
  onSendToBack?: () => void;
  onBringToFront?: () => void;
  onRename?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onToolSelect?: () => void;
  onToolHand?: () => void;
  onToolRect?: () => void;
  onToolEllipse?: () => void;
  onToolPolygon?: () => void;
  onShowHelp?: () => void;
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
      const key = e.key;
      const lower = key.toLowerCase();

      // ─── Modifier-based shortcuts ──────────────────────────────────
      if (mod && e.shiftKey && lower === 'z') {
        e.preventDefault();
        handlers.onRedo?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'z') {
        e.preventDefault();
        handlers.onUndo?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'y') {
        e.preventDefault();
        handlers.onRedo?.();
        return;
      }
      if (mod && e.shiftKey && lower === 'e') {
        e.preventDefault();
        handlers.onExport?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 's') {
        e.preventDefault();
        handlers.onSave?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'o') {
        e.preventDefault();
        handlers.onOpen?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'n') {
        e.preventDefault();
        handlers.onNew?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'd') {
        e.preventDefault();
        handlers.onDuplicate?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'a') {
        e.preventDefault();
        handlers.onSelectAll?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'l') {
        e.preventDefault();
        handlers.onToggleLock?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'c') {
        e.preventDefault();
        handlers.onCopy?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'x') {
        e.preventDefault();
        handlers.onCut?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'v') {
        e.preventDefault();
        handlers.onPaste?.();
        return;
      }
      if (mod && e.shiftKey && lower === 'g') {
        e.preventDefault();
        handlers.onUngroup?.();
        return;
      }
      if (mod && !e.shiftKey && lower === 'g') {
        e.preventDefault();
        handlers.onGroup?.();
        return;
      }
      // Scale section (Ctrl+Shift++/-) — predates the zoom shortcuts below,
      // kept for consistency with the previous behavior.
      if (mod && e.shiftKey && (key === '+' || key === '=')) {
        e.preventDefault();
        handlers.onScaleUp?.();
        return;
      }
      if (mod && e.shiftKey && (key === '_' || key === '-')) {
        e.preventDefault();
        handlers.onScaleDown?.();
        return;
      }
      // Viewport zoom (Ctrl without Shift)
      if (mod && !e.shiftKey && (key === '+' || key === '=')) {
        e.preventDefault();
        handlers.onZoomIn?.();
        return;
      }
      if (mod && !e.shiftKey && key === '-') {
        e.preventDefault();
        handlers.onZoomOut?.();
        return;
      }
      if (mod && !e.shiftKey && key === '0') {
        e.preventDefault();
        handlers.onZoomFit?.();
        return;
      }
      if (mod && !e.shiftKey && key === '1') {
        e.preventDefault();
        handlers.onZoomActual?.();
        return;
      }
      // Bracket layer ordering
      if (!mod && e.shiftKey && key === '{') {
        e.preventDefault();
        handlers.onSendToBack?.();
        return;
      }
      if (!mod && e.shiftKey && key === '}') {
        e.preventDefault();
        handlers.onBringToFront?.();
        return;
      }
      if (!mod && !e.shiftKey && key === '[') {
        e.preventDefault();
        handlers.onSendBackward?.();
        return;
      }
      if (!mod && !e.shiftKey && key === ']') {
        e.preventDefault();
        handlers.onBringForward?.();
        return;
      }
      // Arrow-key nudge
      if (!mod && (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown')) {
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (key === 'ArrowLeft') dx = -step;
        else if (key === 'ArrowRight') dx = step;
        else if (key === 'ArrowUp') dy = -step;
        else if (key === 'ArrowDown') dy = step;
        e.preventDefault();
        handlers.onNudge?.(dx, dy);
        return;
      }
      // Delete / Escape
      if (key === 'Delete' || key === 'Backspace') {
        handlers.onDelete?.();
        return;
      }
      if (key === 'Escape') {
        handlers.onEscape?.();
        return;
      }
      // Rename triggers
      if (!mod && !e.shiftKey && key === 'F2') {
        e.preventDefault();
        handlers.onRename?.();
        return;
      }
      if (!mod && !e.shiftKey && key === 'Enter') {
        e.preventDefault();
        handlers.onRename?.();
        return;
      }
      // Help cheatsheet (Shift+/)
      if (!mod && e.shiftKey && key === '?') {
        e.preventDefault();
        handlers.onShowHelp?.();
        return;
      }
      // Single-letter tool switches (no mod, no shift)
      if (!mod && !e.shiftKey) {
        if (lower === 'v') {
          e.preventDefault();
          handlers.onToolSelect?.();
          return;
        }
        if (lower === 'h') {
          e.preventDefault();
          handlers.onToolHand?.();
          return;
        }
        if (lower === 'r') {
          e.preventDefault();
          handlers.onToolRect?.();
          return;
        }
        if (lower === 'o') {
          e.preventDefault();
          handlers.onToolEllipse?.();
          return;
        }
        if (lower === 'p') {
          e.preventDefault();
          handlers.onToolPolygon?.();
          return;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers]);
}
