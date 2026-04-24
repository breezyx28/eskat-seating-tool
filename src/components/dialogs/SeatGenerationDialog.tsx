import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { IconPicker } from '@/components/sidebar/IconPicker';
import { useCanvasStore } from '@/store/canvasStore';
import type { SeatIcon, SeatGenConfig, Section } from '@/types';
import { generateSeats, computeGridSize, seatsAlongArc } from '@/utils/generateSeats';
import { SeatPreview } from './SeatPreview';
import { findSectionById } from '@/utils/sectionTree';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  sectionId: string | null;
  onClose: () => void;
}

export function SeatGenerationDialog({ open, sectionId, onClose }: Props) {
  const venueData = useCanvasStore((s) => s.venueData);
  const updateSection = useCanvasStore((s) => s.updateSection);

  const section = sectionId ? findSectionById(venueData, sectionId) : null;
  const isArc = section?.type === 'arc' && !!section.arc;
  const isShaped = !!section && section.type !== 'rectangle' && section.type !== 'stage';

  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(12);
  const [rowSpacing, setRowSpacing] = useState(6);
  const [colSpacing, setColSpacing] = useState(4);
  const [seatSize, setSeatSize] = useState(18);
  const [startRowLabel, setStartRowLabel] = useState('A');
  const [numberDirection, setNumberDirection] = useState<'ltr' | 'rtl'>('ltr');
  const [icon, setIcon] = useState<SeatIcon>('chair');
  const [autoFit, setAutoFit] = useState(true);
  const [fitToShape, setFitToShape] = useState(true);
  const [replace, setReplace] = useState(true);

  // Seed state from existing section when dialog opens
  useEffect(() => {
    if (!open || !section) return;
    setIcon(section.seatIcon ?? 'chair');
    // Shaped (non-rectangle) sections default to shape-clipping; plain
    // rectangles and stages don't benefit from it so leave it off.
    setFitToShape(section.type !== 'rectangle' && section.type !== 'stage');
    if (section.seats.length === 0) {
      const estCols = Math.max(4, Math.floor(section.bounds.width / 28));
      const estRows = Math.max(3, Math.floor(section.bounds.height / 28));
      setCols(estCols);
      setRows(estRows);
    }
  }, [open, section]);

  const config: SeatGenConfig = useMemo(() => {
    if (!section) {
      return {
        rows,
        cols,
        rowSpacing,
        colSpacing,
        seatWidth: seatSize,
        seatHeight: seatSize,
        startRowLabel,
        numberDirection,
        offsetX: 10,
        offsetY: 16,
        seatIcon: icon,
      };
    }
    if (autoFit && rows > 0 && cols > 0) {
      const margin = 10;
      const availW = Math.max(20, section.bounds.width - margin * 2);
      const availH = Math.max(20, section.bounds.height - margin * 2);
      const sizeFromW = Math.floor((availW - Math.max(0, cols - 1) * colSpacing) / cols);
      const sizeFromH = Math.floor((availH - Math.max(0, rows - 1) * rowSpacing) / rows);
      const fittedSize = Math.max(6, Math.min(seatSize, sizeFromW, sizeFromH));
      const totalW = cols * fittedSize + Math.max(0, cols - 1) * colSpacing;
      const totalH = rows * fittedSize + Math.max(0, rows - 1) * rowSpacing;
      const offsetX = Math.max(margin, (section.bounds.width - totalW) / 2);
      const offsetY = Math.max(margin, (section.bounds.height - totalH) / 2);
      return {
        rows,
        cols,
        rowSpacing,
        colSpacing,
        seatWidth: fittedSize,
        seatHeight: fittedSize,
        startRowLabel,
        numberDirection,
        offsetX,
        offsetY,
        seatIcon: icon,
      };
    }
    return {
      rows,
      cols,
      rowSpacing,
      colSpacing,
      seatWidth: seatSize,
      seatHeight: seatSize,
      startRowLabel,
      numberDirection,
      offsetX: 10,
      offsetY: 16,
      seatIcon: icon,
    };
  }, [section, rows, cols, rowSpacing, colSpacing, seatSize, startRowLabel, numberDirection, icon, autoFit]);

  const previewSeats = useMemo(() => {
    if (isArc && section?.arc) {
      return seatsAlongArc({
        arc: section.arc,
        cx: section.bounds.width / 2,
        cy: section.bounds.height / 2,
        rows,
        cols,
        seatWidth: seatSize,
        seatHeight: seatSize,
        startRowLabel,
        numberDirection,
      });
    }
    return generateSeats(config, {
      clipTo: fitToShape && section ? section : undefined,
    });
  }, [isArc, section, rows, cols, seatSize, startRowLabel, numberDirection, config, fitToShape]);

  const gridSize = useMemo(() => computeGridSize(config), [config]);

  const handleGenerate = () => {
    if (!section) return;
    const seats = isArc && section.arc
      ? seatsAlongArc({
          arc: section.arc,
          cx: section.bounds.width / 2,
          cy: section.bounds.height / 2,
          rows,
          cols,
          seatWidth: seatSize,
          seatHeight: seatSize,
          startRowLabel,
          numberDirection,
        })
      : generateSeats(config, { clipTo: fitToShape ? section : undefined });
    const newSeats = replace ? seats : [...section.seats, ...seats];
    const updates: Partial<Section> = {
      seats: newSeats,
      seatIcon: icon,
    };
    // Only expand bounds when we're NOT clipping to shape — expanding a circle
    // to fit a grid defeats the purpose of shape-aware generation.
    if (
      !isArc &&
      !fitToShape &&
      (gridSize.width > section.bounds.width || gridSize.height > section.bounds.height)
    ) {
      updates.bounds = {
        ...section.bounds,
        width: Math.max(section.bounds.width, gridSize.width + 20),
        height: Math.max(section.bounds.height, gridSize.height + 20),
      };
    }
    updateSection(section.id, updates);
    toast.success(`${seats.length} seats generated`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          'max-w-3xl w-[min(100vw-2rem,48rem)]',
          'max-h-[calc(100dvh-2rem)]',
          'p-0 overflow-hidden',
          'flex flex-col gap-0'
        )}
      >
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Generate seats</DialogTitle>
          <DialogDescription>
            {section
              ? `Populate "${section.name}" with a grid of seats.`
              : 'Select a section first.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-6 pb-4">
          <div className="space-y-4">
            <Group heading="Grid">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rows">
                  <Input
                    type="number"
                    value={rows}
                    min={1}
                    max={50}
                    onChange={(e) => setRows(Math.max(1, Number(e.target.value) || 1))}
                  />
                </Field>
                <Field label="Seats per row">
                  <Input
                    type="number"
                    value={cols}
                    min={1}
                    max={100}
                    onChange={(e) => setCols(Math.max(1, Number(e.target.value) || 1))}
                  />
                </Field>
              </div>

              <SliderField label="Row spacing" suffix={`${rowSpacing}px`}>
                <Slider
                  value={[rowSpacing]}
                  min={0}
                  max={40}
                  step={1}
                  onValueChange={([v]) => setRowSpacing(v)}
                />
              </SliderField>

              <SliderField label="Column spacing" suffix={`${colSpacing}px`}>
                <Slider
                  value={[colSpacing]}
                  min={0}
                  max={40}
                  step={1}
                  onValueChange={([v]) => setColSpacing(v)}
                />
              </SliderField>

              <SliderField label="Seat size" suffix={`${seatSize}px`}>
                <Slider
                  value={[seatSize]}
                  min={8}
                  max={60}
                  step={1}
                  onValueChange={([v]) => setSeatSize(v)}
                />
              </SliderField>
            </Group>

            <div className="hairline" />

            <Group heading="Seat appearance">
              <Field label="Seat shape">
                <IconPicker
                  value={icon}
                  onChange={(v) => setIcon(v as SeatIcon)}
                  customIcon={section?.customSeatIcon}
                  onCustomChange={(customIcon) => {
                    if (section) updateSection(section.id, { customSeatIcon: customIcon });
                  }}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Starting row label">
                  <Input
                    value={startRowLabel}
                    onChange={(e) => setStartRowLabel(e.target.value)}
                    placeholder="A or 1"
                  />
                </Field>
                <Field label="Numbering">
                  <Select
                    value={numberDirection}
                    onValueChange={(v) => setNumberDirection(v as 'ltr' | 'rtl')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ltr">Left to right</SelectItem>
                      <SelectItem value="rtl">Right to left</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Group>

            <div className="hairline" />

            <Group heading="Options">
              <ToggleRow
                label="Auto-size to section bounds"
                checked={autoFit}
                onCheckedChange={setAutoFit}
              />
              <ToggleRow
                label="Fit seats to shape"
                hint={
                  isShaped
                    ? `Removes seats outside the ${section?.type} silhouette`
                    : undefined
                }
                checked={fitToShape}
                onCheckedChange={setFitToShape}
                disabled={isArc}
              />
              <ToggleRow
                label="Replace existing seats"
                checked={replace}
                onCheckedChange={setReplace}
              />
            </Group>
          </div>

          <aside className="space-y-3">
            <Label tone="mono">Live preview</Label>
            <div
              className="rounded-md overflow-hidden"
              style={{
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border)',
              }}
            >
              <SeatPreview
                seats={previewSeats}
                width={320}
                height={320}
                icon={icon}
                customIcon={section?.customSeatIcon}
              />
            </div>
            <dl
              className="text-[11px] grid grid-cols-2 gap-x-3 gap-y-1.5"
              style={{ color: 'var(--text-muted)' }}
            >
              <Stat label="Total seats" value={String(previewSeats.length)} />
              <Stat
                label="Grid"
                value={`${Math.round(gridSize.width)} × ${Math.round(gridSize.height)}`}
              />
              {section && (
                <Stat
                  label="Section"
                  value={`${Math.round(section.bounds.width)} × ${Math.round(section.bounds.height)}`}
                  span
                />
              )}
            </dl>
          </aside>
          </div>
        </div>

        <DialogFooter className="border-t border-[var(--border)] px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleGenerate} disabled={!section}>
            Generate {previewSeats.length} seat{previewSeats.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function Group({
  heading,
  children,
}: {
  heading?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      {heading && <Label tone="mono">{heading}</Label>}
      {children}
    </section>
  );
}

function SliderField({
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

function ToggleRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-sm px-2.5 py-2"
      style={{
        background: 'var(--bg-panel-raised)',
        border: '1px solid var(--border)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div className="flex-1 min-w-0">
        <Label className="cursor-pointer">{label}</Label>
        {hint && (
          <div
            className="text-[10.5px] mt-0.5 leading-snug"
            style={{ color: 'var(--text-muted)' }}
          >
            {hint}
          </div>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

function Stat({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${span ? 'col-span-2' : ''}`}>
      <dt className="mono-label mono-label--tight">{label}</dt>
      <dd className="tab-num" style={{ color: 'var(--text-primary)' }}>
        {value}
      </dd>
    </div>
  );
}
