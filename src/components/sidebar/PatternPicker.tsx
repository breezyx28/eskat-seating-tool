import type { SectionPattern } from '@/types';
import { PATTERN_PRESETS } from '@/utils/patterns';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface PatternPickerProps {
  value: SectionPattern | undefined;
  onChange: (v: SectionPattern) => void;
  onCommit?: () => void;
}

export function PatternPicker({ value, onChange, onCommit }: PatternPickerProps) {
  const v: SectionPattern = value ?? { type: 'none' };

  const patch = (updates: Partial<SectionPattern>) => {
    onChange({ ...v, ...updates });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1">
        {PATTERN_PRESETS.map((preset) => {
          const active = (v.type ?? 'none') === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              className="h-8 rounded-sm text-[10px] font-medium flex items-center justify-center transition-[background-color,border-color,color,transform] duration-base ease-soft-spring hover:border-[var(--border-strong)] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]"
              style={{
                background: active ? 'var(--accent-soft)' : 'var(--bg-panel-raised)',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
              }}
              onClick={() => {
                patch({ type: preset.id });
                onCommit?.();
              }}
              title={preset.label}
              aria-pressed={active}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {v.type && v.type !== 'none' && (
        <div className="space-y-3">
          <Row label="Color">
            <ColorPicker
              value={v.color ?? '#ffffff'}
              onChange={(c) => patch({ color: c })}
              onCommit={onCommit}
            />
          </Row>

          {v.type !== 'custom' && (
            <>
              <SliderRow label="Size" suffix={`${v.size ?? 4}px`}>
                <Slider
                  value={[v.size ?? 4]}
                  min={1}
                  max={40}
                  step={1}
                  onValueChange={([nv]) => patch({ size: nv })}
                  onValueCommit={onCommit}
                />
              </SliderRow>
              <SliderRow label="Spacing" suffix={`${v.spacing ?? 16}px`}>
                <Slider
                  value={[v.spacing ?? 16]}
                  min={2}
                  max={80}
                  step={1}
                  onValueChange={([nv]) => patch({ spacing: nv })}
                  onValueCommit={onCommit}
                />
              </SliderRow>
            </>
          )}

          <SliderRow
            label="Opacity"
            suffix={`${Math.round((v.opacity ?? 0.35) * 100)}%`}
          >
            <Slider
              value={[(v.opacity ?? 0.35) * 100]}
              min={10}
              max={100}
              step={1}
              onValueChange={([nv]) => patch({ opacity: nv / 100 })}
              onValueCommit={onCommit}
            />
          </SliderRow>

          {v.type === 'custom' && (
            <div className="space-y-1.5">
              <Label>Custom SVG (inner markup)</Label>
              <textarea
                value={v.customSvg ?? ''}
                onChange={(e) => patch({ customSvg: e.target.value })}
                onBlur={onCommit}
                rows={4}
                placeholder='<circle cx="10" cy="10" r="3" fill="currentColor" />'
                className="w-full text-[11px] font-mono p-2 rounded-sm resize-y transition-colors duration-base focus:outline-none focus:border-[var(--accent-border)] focus:bg-[var(--bg-panel-raised)]"
                style={{
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span
          className="text-[11px] font-medium tab-num"
          style={{ color: 'var(--text-primary)' }}
        >
          {suffix}
        </span>
      </div>
      {children}
    </div>
  );
}
