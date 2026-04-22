import { useMemo } from 'react';
import type { Section } from '@/types';

export interface Guide {
  type: 'vertical' | 'horizontal';
  position: number;
}

const THRESHOLD = 5; // pixels

export function useAlignmentGuides(
  sections: Section[],
  draggingId: string | null,
  draggingBounds: { x: number; y: number; width: number; height: number } | null
): Guide[] {
  return useMemo(() => {
    if (!draggingId || !draggingBounds) return [];
    const guides: Guide[] = [];
    const others = sections.filter((s) => s.id !== draggingId);

    const dragEdges = {
      left: draggingBounds.x,
      right: draggingBounds.x + draggingBounds.width,
      centerX: draggingBounds.x + draggingBounds.width / 2,
      top: draggingBounds.y,
      bottom: draggingBounds.y + draggingBounds.height,
      centerY: draggingBounds.y + draggingBounds.height / 2,
    };

    for (const other of others) {
      const otherEdges = {
        left: other.bounds.x,
        right: other.bounds.x + other.bounds.width,
        centerX: other.bounds.x + other.bounds.width / 2,
        top: other.bounds.y,
        bottom: other.bounds.y + other.bounds.height,
        centerY: other.bounds.y + other.bounds.height / 2,
      };

      const vCandidates = [otherEdges.left, otherEdges.right, otherEdges.centerX];
      const hCandidates = [otherEdges.top, otherEdges.bottom, otherEdges.centerY];

      for (const vPos of vCandidates) {
        if (
          Math.abs(dragEdges.left - vPos) < THRESHOLD ||
          Math.abs(dragEdges.right - vPos) < THRESHOLD ||
          Math.abs(dragEdges.centerX - vPos) < THRESHOLD
        ) {
          guides.push({ type: 'vertical', position: vPos });
        }
      }

      for (const hPos of hCandidates) {
        if (
          Math.abs(dragEdges.top - hPos) < THRESHOLD ||
          Math.abs(dragEdges.bottom - hPos) < THRESHOLD ||
          Math.abs(dragEdges.centerY - hPos) < THRESHOLD
        ) {
          guides.push({ type: 'horizontal', position: hPos });
        }
      }
    }

    return guides;
  }, [sections, draggingId, draggingBounds]);
}
