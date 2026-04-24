import { useEffect, useState } from 'react';
import type { Section, SeatIcon } from '@/types';
import type {
  Overrides,
  SectionOverride,
  GlobalOverride,
} from '@/utils/templateOverrides';
import { seatCountToDensity } from '@/utils/templateOverrides';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker } from '@/components/ui/ColorPicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CaretDown, ArrowCounterClockwise } from '@phosphor-icons/react';

const SEAT_ICON_OPTIONS: { value: SeatIcon; label: string }[] = [
  { value: 'chair', label: 'Chair' },
  { value: 'chair-simple', label: 'Chair (simple)' },
  { value: 'circle', label: 'Circle' },
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
];

interface Props {
  sections: Section[];
  edits: Overrides;
  onGlobalChange: (patch: Partial<GlobalOverride>) => void;
  onSectionChange: (sectionId: string, patch: Partial<SectionOverride>) => void;
  onDensityChange: (density: number) => void;
  onReset: () => void;
  componentName: string;
  onComponentNameChange: (name: string) => void;
  totalSeatsBase: number;
  totalSeatsDerived: number;
}

export function ControlPanel({
  sections,
  edits,
  onGlobalChange,
  onSectionChange,
  onDensityChange,
  onReset,
  componentName,
  onComponentNameChange,
  totalSeatsBase,
  totalSeatsDerived,
}: Props) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4">
        <header className="flex items-center justify-between">
          <div>
            <div
              className="mono-label"
              style={{ color: 'var(--text-primary)' }}
            >
              Customize
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Tweak the template — live preview updates as you type.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            title="Reset all overrides"
          >
            <ArrowCounterClockwise size={12} />
            Reset
          </Button>
        </header>

        <GlobalSection
          edits={edits.global}
          onGlobalChange={onGlobalChange}
          density={edits.density}
          onDensityChange={onDensityChange}
          componentName={componentName}
          onComponentNameChange={onComponentNameChange}
          totalSeatsBase={totalSeatsBase}
          totalSeatsDerived={totalSeatsDerived}
        />

        <PerSectionAccordion
          sections={sections}
          edits={edits.sections}
          onSectionChange={onSectionChange}
        />
      </div>
    </div>
  );
}

// ─── Global section ──────────────────────────────────────────────

function GlobalSection({
  edits,
  onGlobalChange,
  density,
  onDensityChange,
  componentName,
  onComponentNameChange,
  totalSeatsBase,
  totalSeatsDerived,
}: {
  edits: GlobalOverride;
  onGlobalChange: (patch: Partial<GlobalOverride>) => void;
  density: number;
  onDensityChange: (d: number) => void;
  componentName: string;
  onComponentNameChange: (n: string) => void;
  totalSeatsBase: number;
  totalSeatsDerived: number;
}) {
  return (
    <section
      className="rounded-md border p-3 space-y-3"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-panel-raised)',
      }}
    >
      <div
        className="mono-label"
        style={{ color: 'var(--text-secondary)' }}
      >
        Global
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">Component name</Label>
        <Input
          value={componentName}
          onChange={(e) => onComponentNameChange(e.target.value)}
          placeholder="SeatMap"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">Background</Label>
        <ColorPicker
          value={edits.background ?? '#0f172a'}
          onChange={(v) => onGlobalChange({ background: v })}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px]">Default seat icon</Label>
        <Select
          value={edits.seatIcon ?? 'chair'}
          onValueChange={(v) => onGlobalChange({ seatIcon: v as SeatIcon })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEAT_ICON_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[11px]">Currency</Label>
          <Input
            value={edits.currency ?? ''}
            onChange={(e) => onGlobalChange({ currency: e.target.value })}
            placeholder="$"
            maxLength={4}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px]">Row start letter</Label>
          <Input
            value={edits.rowStartLetter ?? ''}
            onChange={(e) =>
              onGlobalChange({ rowStartLetter: e.target.value.toUpperCase() })
            }
            placeholder="A"
            maxLength={2}
          />
        </div>
      </div>

      <SeatCountField
        density={density}
        onDensityChange={onDensityChange}
        totalSeatsBase={totalSeatsBase}
        totalSeatsDerived={totalSeatsDerived}
      />
    </section>
  );
}

// ─── Seat-count input ────────────────────────────────────────────

function SeatCountField({
  density,
  onDensityChange,
  totalSeatsBase,
  totalSeatsDerived,
}: {
  density: number;
  onDensityChange: (d: number) => void;
  totalSeatsBase: number;
  totalSeatsDerived: number;
}) {
  // Mirror the derived seat count locally so users can type freely (e.g.
  // clear the field, type "400") without each keystroke being clamped or
  // re-derived. Commit on blur / Enter.
  const minCount = Math.max(10, Math.ceil(totalSeatsBase * 0.05));
  const [draft, setDraft] = useState<string>(String(totalSeatsDerived));

  // Resync when the derived count changes externally (template switched,
  // reset clicked, etc.) and the user isn't mid-edit.
  useEffect(() => {
    setDraft(String(totalSeatsDerived));
  }, [totalSeatsDerived]);

  const commit = (raw: string) => {
    if (!/^\d+$/.test(raw.trim())) {
      // Non-integer or empty — snap back to last derived count.
      setDraft(String(totalSeatsDerived));
      return;
    }
    const n = Number(raw);
    const next = seatCountToDensity(n, totalSeatsBase);
    if (Math.abs(next - density) > 1e-6) onDensityChange(next);
    // Reflect the clamped value immediately so the field shows the value
    // that will actually be applied.
    const clamped = Math.max(minCount, Math.min(totalSeatsBase, Math.round(n)));
    setDraft(String(clamped));
  };

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between">
        <Label className="text-[11px]">Number of seats</Label>
        <span
          className="text-[11px] tab-num"
          style={{ color: 'var(--text-muted)' }}
        >
          base {totalSeatsBase.toLocaleString()}
        </span>
      </div>
      <Input
        type="number"
        inputMode="numeric"
        min={minCount}
        max={totalSeatsBase}
        step={1}
        value={draft}
        onChange={(e) => {
          // Strip anything that isn't a digit so users can't paste decimals
          // or negative signs.
          const cleaned = e.target.value.replace(/[^0-9]/g, '');
          setDraft(cleaned);
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          }
          // Block decimal/exponent entry that <input type=number> normally allows.
          if (e.key === '.' || e.key === ',' || e.key === 'e' || e.key === '-' || e.key === '+') {
            e.preventDefault();
          }
        }}
      />
      <p
        className="text-[10.5px] leading-relaxed"
        style={{ color: 'var(--text-faint)' }}
      >
        Rendering{' '}
        <span style={{ color: 'var(--text-primary)' }} className="tab-num">
          {totalSeatsDerived.toLocaleString()}
        </span>{' '}
        of {totalSeatsBase.toLocaleString()} seats — sizes scale up to keep
        the template shape and seat-to-gap ratio.
      </p>
    </div>
  );
}

// ─── Per-section accordion ───────────────────────────────────────

function PerSectionAccordion({
  sections,
  edits,
  onSectionChange,
}: {
  sections: Section[];
  edits: Record<string, SectionOverride>;
  onSectionChange: (sectionId: string, patch: Partial<SectionOverride>) => void;
}) {
  return (
    <section className="space-y-1.5">
      <div
        className="mono-label"
        style={{ color: 'var(--text-secondary)' }}
      >
        Sections ({sections.length})
      </div>
      <div className="space-y-1">
        {sections.map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            patch={edits[section.id] ?? {}}
            onChange={(p) => onSectionChange(section.id, p)}
          />
        ))}
      </div>
    </section>
  );
}

function SectionItem({
  section,
  patch,
  onChange,
}: {
  section: Section;
  patch: SectionOverride;
  onChange: (p: Partial<SectionOverride>) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasOverride = Object.keys(patch).length > 0;
  const displayName = patch.name ?? section.name;

  return (
    <div
      className="rounded-md border overflow-hidden"
      style={{
        borderColor: hasOverride ? 'var(--accent-border)' : 'var(--border)',
        background: 'var(--bg-panel-raised)',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0 border"
            style={{
              background: patch.fill ?? section.fill,
              borderColor: patch.stroke ?? section.stroke,
            }}
          />
          <span
            className="text-[12.5px] font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {displayName}
          </span>
          <span
            className="text-[10.5px] shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            {section.seats.length} seats
          </span>
        </div>
        <CaretDown
          size={11}
          weight="bold"
          className="shrink-0 transition-transform duration-base"
          style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          className="px-3 pb-3 pt-1 space-y-2.5 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Name</Label>
              <Input
                value={patch.name ?? section.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Price</Label>
              <Input
                type="number"
                value={patch.price ?? section.price}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  onChange({ price: Number.isFinite(n) ? n : 0 });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Currency</Label>
              <Input
                value={patch.currency ?? section.currency}
                onChange={(e) => onChange({ currency: e.target.value })}
                maxLength={4}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Fill</Label>
              <ColorPicker
                value={patch.fill ?? section.fill}
                onChange={(v) => onChange({ fill: v })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Stroke</Label>
              <ColorPicker
                value={patch.stroke ?? section.stroke}
                onChange={(v) => onChange({ stroke: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Row start</Label>
              <Input
                value={patch.rowStartLetter ?? ''}
                onChange={(e) =>
                  onChange({
                    rowStartLetter: e.target.value.toUpperCase() || undefined,
                  })
                }
                placeholder="inherit"
                maxLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px]">Seat icon</Label>
              <Select
                value={patch.seatIcon ?? section.seatIcon ?? 'chair'}
                onValueChange={(v) => onChange({ seatIcon: v as SeatIcon })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEAT_ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
