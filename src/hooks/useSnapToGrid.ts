import { useCanvasStore } from '@/store/canvasStore';

export function useSnapToGrid() {
  const snapEnabled = useCanvasStore((s) => s.snapEnabled);
  const gridSize = useCanvasStore((s) => s.gridSize);

  const snap = (value: number): number => {
    if (!snapEnabled) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  const snapPoint = (x: number, y: number) => ({
    x: snap(x),
    y: snap(y),
  });

  return { snap, snapPoint, snapEnabled, gridSize };
}
