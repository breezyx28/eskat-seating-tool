import { useCanvasStore } from '@/store/canvasStore';
import type { Seat, SeatState } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash } from '@phosphor-icons/react';

interface SeatPropertiesProps {
  sectionId: string;
  seat: Seat;
}

export function SeatProperties({ sectionId, seat }: SeatPropertiesProps) {
  const updateSeat = useCanvasStore((s) => s.updateSeat);
  const updateSeats = useCanvasStore((s) => s.updateSeats);

  const sectionName = useCanvasStore(
    (s) => s.venueData.sections.find((sec) => sec.id === sectionId)?.name
  );

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Label tone="mono">Seat · {seat.label}</Label>
        {sectionName ? (
          <span
            className="text-[10px] font-medium px-2 py-[3px] rounded-sm truncate max-w-[140px]"
            style={{
              background: 'var(--bg-panel-raised)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
            title={sectionName}
          >
            {sectionName}
          </span>
        ) : null}
      </div>

      <div className="space-y-3">
        <Field label="State">
          <Select
            value={seat.state}
            onValueChange={(v) => updateSeat(sectionId, seat.id, { state: v as SeatState })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Row">
            <Input
              value={seat.rowLabel}
              onChange={(e) => updateSeat(sectionId, seat.id, { rowLabel: e.target.value })}
            />
          </Field>
          <Field label="Seat #">
            <Input
              value={seat.seatNumber}
              onChange={(e) => updateSeat(sectionId, seat.id, { seatNumber: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Custom label (optional)">
          <Input
            value={seat.customLabel ?? ''}
            placeholder={seat.label}
            onChange={(e) =>
              updateSeat(sectionId, seat.id, {
                customLabel: e.target.value || undefined,
              })
            }
          />
        </Field>

        <div
          className="flex items-center justify-between gap-2 py-1.5"
        >
          <Label>Accessible (wheelchair)</Label>
          <Switch
            checked={seat.accessible}
            onCheckedChange={(v) => updateSeat(sectionId, seat.id, { accessible: v })}
          />
        </div>

        <div className="hairline" />

        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={() =>
            updateSeats(sectionId, (seats) => seats.filter((s) => s.id !== seat.id))
          }
        >
          <Trash size={14} weight="bold" />
          Delete seat
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
