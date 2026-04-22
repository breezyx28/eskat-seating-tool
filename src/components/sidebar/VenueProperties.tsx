import { useCanvasStore } from '@/store/canvasStore';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Info } from '@phosphor-icons/react';

export function VenueProperties() {
  const venue = useCanvasStore((s) => s.venueData.venue);
  const updateVenue = useCanvasStore((s) => s.updateVenue);

  return (
    <div className="p-4 space-y-5">
      <section className="space-y-3">
        <Label tone="mono">Venue</Label>

        <Field label="Name">
          <Input
            value={venue.name}
            onChange={(e) => updateVenue({ name: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Width">
            <Input
              type="number"
              value={venue.width}
              min={200}
              onChange={(e) => updateVenue({ width: Number(e.target.value) || venue.width })}
            />
          </Field>
          <Field label="Height">
            <Input
              type="number"
              value={venue.height}
              min={200}
              onChange={(e) => updateVenue({ height: Number(e.target.value) || venue.height })}
            />
          </Field>
        </div>

        <Field label="Background">
          <ColorPicker
            value={venue.background}
            onChange={(v) => updateVenue({ background: v })}
          />
        </Field>
      </section>

      <div className="hairline" />

      <div
        className="flex gap-2 rounded-md p-3 text-[11.5px] leading-relaxed"
        style={{
          background: 'var(--bg-panel-raised)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <Info size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
        <p>
          Select a section on the canvas to edit its properties. Drag shapes from the
          Shapes tab to add new sections.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
