import { useCanvasStore } from '@/store/canvasStore';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash } from '@phosphor-icons/react';
import type { StageElement } from '@/types';

export function StageProperties({ stage }: { stage: StageElement }) {
  const setStage = useCanvasStore((s) => s.setStage);

  const update = (updates: Partial<StageElement>) => {
    setStage({ ...stage, ...updates });
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <Label tone="mono">Stage</Label>
        <span
          className="text-[10px] font-medium px-2 py-[3px] rounded-sm mono-label--tight"
          style={{
            background: 'var(--bg-panel-raised)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          STAGE
        </span>
      </div>

      <div className="space-y-3">
        <Field label="Label">
          <Input value={stage.label} onChange={(e) => update({ label: e.target.value })} />
        </Field>
        <Field label="Fill">
          <ColorPicker value={stage.fill} onChange={(v) => update({ fill: v })} />
        </Field>

        <div className="space-y-2">
          <Label tone="mono">Bounds</Label>
          <div className="grid grid-cols-2 gap-2">
            <Field label="X">
              <Input
                type="number"
                value={Math.round(stage.bounds.x)}
                onChange={(e) =>
                  update({
                    bounds: { ...stage.bounds, x: Number(e.target.value) || 0 },
                  })
                }
              />
            </Field>
            <Field label="Y">
              <Input
                type="number"
                value={Math.round(stage.bounds.y)}
                onChange={(e) =>
                  update({
                    bounds: { ...stage.bounds, y: Number(e.target.value) || 0 },
                  })
                }
              />
            </Field>
            <Field label="Width">
              <Input
                type="number"
                value={Math.round(stage.bounds.width)}
                onChange={(e) =>
                  update({
                    bounds: { ...stage.bounds, width: Number(e.target.value) || 50 },
                  })
                }
              />
            </Field>
            <Field label="Height">
              <Input
                type="number"
                value={Math.round(stage.bounds.height)}
                onChange={(e) =>
                  update({
                    bounds: { ...stage.bounds, height: Number(e.target.value) || 50 },
                  })
                }
              />
            </Field>
          </div>
        </div>

        <div className="hairline" />

        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={() => setStage(undefined)}
        >
          <Trash size={14} weight="bold" />
          Remove stage
        </Button>
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
