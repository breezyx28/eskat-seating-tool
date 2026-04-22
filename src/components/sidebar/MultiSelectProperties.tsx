import { useCanvasStore } from '@/store/canvasStore';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SeatState } from '@/types';
import { Trash } from '@phosphor-icons/react';

interface MultiSelectPropertiesProps {
  sectionIds: string[];
  seatSelections: { sectionId: string; seatId: string }[];
}

export function MultiSelectProperties({
  sectionIds,
  seatSelections,
}: MultiSelectPropertiesProps) {
  const updateSection = useCanvasStore((s) => s.updateSection);
  const updateSeats = useCanvasStore((s) => s.updateSeats);
  const removeSection = useCanvasStore((s) => s.removeSection);
  const deleteSeats = useCanvasStore((s) => s.deleteSeats);
  const venueData = useCanvasStore((s) => s.venueData);

  const selectedSections = venueData.sections.filter((s) => sectionIds.includes(s.id));
  const commonFill =
    selectedSections.length > 0 && selectedSections.every((s) => s.fill === selectedSections[0].fill)
      ? selectedSections[0].fill
      : '';

  const setAllFill = (fill: string) => {
    for (const id of sectionIds) updateSection(id, { fill });
  };

  const setAllPrice = (price: number) => {
    for (const id of sectionIds) updateSection(id, { price });
  };

  const seatIds = seatSelections.map((s) => s.seatId);
  const setSeatState = (state: SeatState) => {
    const byS = new Map<string, string[]>();
    for (const { sectionId, seatId } of seatSelections) {
      if (!byS.has(sectionId)) byS.set(sectionId, []);
      byS.get(sectionId)!.push(seatId);
    }
    for (const [sectionId, ids] of byS) {
      updateSeats(sectionId, (seats) =>
        seats.map((s) => (ids.includes(s.id) ? { ...s, state } : s))
      );
    }
  };

  const totalSelected = sectionIds.length + seatIds.length;

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <Label tone="mono">Multi-select</Label>
        <span
          className="text-[10px] font-medium px-2 py-[3px] rounded-sm tab-num"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            border: '1px solid var(--accent-border)',
          }}
        >
          {totalSelected} ITEMS
        </span>
      </div>

      {sectionIds.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label tone="mono">Sections</Label>
            <span className="text-[11px] tab-num" style={{ color: 'var(--text-muted)' }}>
              {sectionIds.length}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label>Fill (applies to all)</Label>
            <ColorPicker value={commonFill || '#a855f7'} onChange={setAllFill} />
          </div>
          <div className="space-y-1.5">
            <Label>Price (applies to all)</Label>
            <Input
              type="number"
              placeholder="e.g. 100"
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) setAllPrice(v);
              }}
            />
          </div>

          <div className="hairline" />

          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => {
              for (const id of sectionIds) removeSection(id);
            }}
          >
            <Trash size={14} weight="bold" />
            Delete {sectionIds.length} section{sectionIds.length > 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {sectionIds.length > 0 && seatSelections.length > 0 && <div className="hairline" />}

      {seatSelections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label tone="mono">Seats</Label>
            <span className="text-[11px] tab-num" style={{ color: 'var(--text-muted)' }}>
              {seatIds.length}
            </span>
          </div>
          <div className="space-y-1.5">
            <Label>State (applies to all)</Label>
            <Select onValueChange={(v) => setSeatState(v as SeatState)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose state…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="hairline" />

          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={() => deleteSeats(seatIds)}
          >
            <Trash size={14} weight="bold" />
            Delete {seatIds.length} seat{seatIds.length > 1 ? 's' : ''}
          </Button>
        </div>
      )}
    </div>
  );
}
