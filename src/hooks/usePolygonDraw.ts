import { useState, useCallback, useEffect } from 'react';
import type { Point } from '@/types';

export interface PolygonDrawState {
  isDrawing: boolean;
  points: Point[];
  cursorPos: Point | null;
}

export function usePolygonDraw(onFinish: (points: Point[]) => void, onCancel?: () => void) {
  const [state, setState] = useState<PolygonDrawState>({
    isDrawing: false,
    points: [],
    cursorPos: null,
  });

  const start = useCallback(() => {
    setState({ isDrawing: true, points: [], cursorPos: null });
  }, []);

  const cancel = useCallback(() => {
    setState({ isDrawing: false, points: [], cursorPos: null });
    onCancel?.();
  }, [onCancel]);

  const addPoint = useCallback(
    (p: Point) => {
      setState((prev) => {
        if (!prev.isDrawing) return prev;
        // double-click: check recent point
        const last = prev.points[prev.points.length - 1];
        if (last && Math.hypot(last.x - p.x, last.y - p.y) < 5) {
          if (prev.points.length >= 3) {
            onFinish(prev.points);
            return { isDrawing: false, points: [], cursorPos: null };
          }
          return prev;
        }
        return { ...prev, points: [...prev.points, p] };
      });
    },
    [onFinish]
  );

  const finish = useCallback(() => {
    setState((prev) => {
      if (prev.points.length >= 3) {
        onFinish(prev.points);
        return { isDrawing: false, points: [], cursorPos: null };
      }
      return prev;
    });
  }, [onFinish]);

  const updateCursor = useCallback((p: Point) => {
    setState((prev) => ({ ...prev, cursorPos: p }));
  }, []);

  useEffect(() => {
    if (!state.isDrawing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancel();
      } else if (e.key === 'Enter') {
        finish();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.isDrawing, cancel, finish]);

  return {
    ...state,
    start,
    cancel,
    addPoint,
    finish,
    updateCursor,
  };
}
