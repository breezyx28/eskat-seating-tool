import { useCanvasStore } from '@/store/canvasStore';
import type { Section, SeatIcon, SectionInteractions, SectionPattern } from '@/types';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IconPicker } from './IconPicker';
import { PatternPicker } from './PatternPicker';
import {
  Rows,
  Trash,
  TreeStructure,
  SignIn,
  Broom,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
} from '@phosphor-icons/react';
import { isContainer } from '@/utils/sectionTree';

interface SectionPropertiesProps {
  section: Section;
  onGenerateSeats?: (sectionId: string) => void;
}

export function SectionProperties({ section, onGenerateSeats }: SectionPropertiesProps) {
  const updateSection = useCanvasStore((s) => s.updateSection);
  const updateSectionNoHistory = useCanvasStore((s) => s.updateSectionNoHistory);
  const commitHistory = useCanvasStore((s) => s.commitHistory);
  const removeSection = useCanvasStore((s) => s.removeSection);
  const convertToContainer = useCanvasStore((s) => s.convertToContainer);
  const drillInto = useCanvasStore((s) => s.drillInto);
  const clearSectionSeats = useCanvasStore((s) => s.clearSectionSeats);
  const scaleSection = useCanvasStore((s) => s.scaleSection);

  const container = isContainer(section);
  const interactions: SectionInteractions = section.interactions ?? {};
  const patchInteractions = (patch: Partial<SectionInteractions>) => {
    updateSection(section.id, { interactions: { ...interactions, ...patch } });
  };
  const patchPattern = (pattern: SectionPattern) => {
    updateSectionNoHistory(section.id, { pattern });
  };

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Label tone="mono">Section</Label>
        <span
          className="mono-label mono-label--tight px-1.5 h-4 inline-flex items-center rounded-sm"
          style={{
            background: 'var(--bg-panel-raised)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          {section.type}
        </span>
      </header>

      {/* Identity */}
      <Group>
        <Field label="Name">
          <Input
            value={section.name}
            onChange={(e) => updateSection(section.id, { name: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-[1fr_60px_70px] gap-2">
          <Field label="Price">
            <Input
              type="number"
              value={section.price}
              min={0}
              onChange={(e) =>
                updateSection(section.id, { price: Number(e.target.value) || 0 })
              }
            />
          </Field>
          <Field label="Cur.">
            <Input
              value={section.currency}
              maxLength={3}
              onChange={(e) => updateSection(section.id, { currency: e.target.value })}
            />
          </Field>
          <Field label="Z-ind.">
            <Input
              type="number"
              value={section.zIndex}
              onChange={(e) =>
                updateSection(section.id, { zIndex: Number(e.target.value) || 0 })
              }
            />
          </Field>
        </div>
      </Group>

      <div className="hairline" />

      {/* Geometry */}
      <Group heading="Geometry">
        <div className="grid grid-cols-2 gap-2">
          <Field label="X">
            <Input
              type="number"
              value={Math.round(section.bounds.x)}
              onChange={(e) =>
                updateSection(section.id, {
                  bounds: { ...section.bounds, x: Number(e.target.value) || 0 },
                })
              }
            />
          </Field>
          <Field label="Y">
            <Input
              type="number"
              value={Math.round(section.bounds.y)}
              onChange={(e) =>
                updateSection(section.id, {
                  bounds: { ...section.bounds, y: Number(e.target.value) || 0 },
                })
              }
            />
          </Field>
          <Field label="Width">
            <Input
              type="number"
              min={10}
              value={Math.round(section.bounds.width)}
              onChange={(e) =>
                updateSection(section.id, {
                  bounds: { ...section.bounds, width: Number(e.target.value) || 10 },
                })
              }
            />
          </Field>
          <Field label="Height">
            <Input
              type="number"
              min={10}
              value={Math.round(section.bounds.height)}
              onChange={(e) =>
                updateSection(section.id, {
                  bounds: { ...section.bounds, height: Number(e.target.value) || 10 },
                })
              }
            />
          </Field>
        </div>

        <SliderField label="Rotation" suffix={`${Math.round(section.rotation)}°`}>
          <Slider
            value={[section.rotation]}
            min={0}
            max={360}
            step={1}
            onValueChange={([v]) => updateSectionNoHistory(section.id, { rotation: v })}
            onValueCommit={() => commitHistory()}
          />
        </SliderField>

        {section.type === 'rectangle' && (
          <SliderField label="Corner radius" suffix={`${section.cornerRadius ?? 6}px`}>
            <Slider
              value={[section.cornerRadius ?? 6]}
              min={0}
              max={80}
              step={1}
              onValueChange={([v]) => updateSectionNoHistory(section.id, { cornerRadius: v })}
              onValueCommit={() => commitHistory()}
            />
          </SliderField>
        )}
      </Group>

      {section.type === 'arc' && section.arc && (
        <>
          <div className="hairline" />
          <Group heading="Arc">
            <SliderField
              label="Start angle"
              suffix={`${Math.round((section.arc.startAngle * 180) / Math.PI)}°`}
            >
              <Slider
                value={[(section.arc.startAngle * 180) / Math.PI]}
                min={-360}
                max={360}
                step={1}
                onValueChange={([v]) =>
                  updateSectionNoHistory(section.id, {
                    arc: { ...section.arc!, startAngle: (v * Math.PI) / 180 },
                  })
                }
                onValueCommit={() => commitHistory()}
              />
            </SliderField>

            <SliderField
              label="End angle"
              suffix={`${Math.round((section.arc.endAngle * 180) / Math.PI)}°`}
            >
              <Slider
                value={[(section.arc.endAngle * 180) / Math.PI]}
                min={-360}
                max={720}
                step={1}
                onValueChange={([v]) =>
                  updateSectionNoHistory(section.id, {
                    arc: { ...section.arc!, endAngle: (v * Math.PI) / 180 },
                  })
                }
                onValueCommit={() => commitHistory()}
              />
            </SliderField>

            <SliderField
              label="Inner radius"
              suffix={`${Math.round(section.arc.innerRadius)}px`}
            >
              <Slider
                value={[section.arc.innerRadius]}
                min={0}
                max={400}
                step={1}
                onValueChange={([v]) =>
                  updateSectionNoHistory(section.id, {
                    arc: { ...section.arc!, innerRadius: v },
                  })
                }
                onValueCommit={() => commitHistory()}
              />
            </SliderField>

            <SliderField
              label="Outer radius"
              suffix={`${Math.round(section.arc.outerRadius)}px`}
            >
              <Slider
                value={[section.arc.outerRadius]}
                min={10}
                max={600}
                step={1}
                onValueChange={([v]) =>
                  updateSectionNoHistory(section.id, {
                    arc: { ...section.arc!, outerRadius: v },
                  })
                }
                onValueCommit={() => commitHistory()}
              />
            </SliderField>
          </Group>
        </>
      )}

      <div className="hairline" />

      {/* Surface */}
      <Group heading="Surface">
        <Field label="Fill">
          <ColorPicker
            value={section.fill}
            onChange={(v) => updateSectionNoHistory(section.id, { fill: v })}
            onCommit={() => commitHistory()}
          />
        </Field>
        <Field label="Stroke">
          <ColorPicker
            value={section.stroke}
            onChange={(v) => updateSectionNoHistory(section.id, { stroke: v })}
            onCommit={() => commitHistory()}
          />
        </Field>
        <SliderField label="Stroke width" suffix={`${section.strokeWidth}px`}>
          <Slider
            value={[section.strokeWidth]}
            min={0}
            max={10}
            step={1}
            onValueChange={([v]) => updateSectionNoHistory(section.id, { strokeWidth: v })}
            onValueCommit={() => commitHistory()}
          />
        </SliderField>
        <SliderField label="Opacity" suffix={`${Math.round(section.opacity * 100)}%`}>
          <Slider
            value={[section.opacity * 100]}
            min={10}
            max={100}
            step={1}
            onValueChange={([v]) => updateSectionNoHistory(section.id, { opacity: v / 100 })}
            onValueCommit={() => commitHistory()}
          />
        </SliderField>
      </Group>

      <div className="hairline" />

      <Group heading="Pattern">
        <PatternPicker
          value={section.pattern}
          onChange={patchPattern}
          onCommit={() => commitHistory()}
        />
      </Group>

      <div className="hairline" />

      <Group heading="Interactions">
        <Field label="Tooltip">
          <Input
            value={interactions.tooltip ?? ''}
            placeholder="Shown on hover in exported map"
            onChange={(e) => patchInteractions({ tooltip: e.target.value || undefined })}
          />
        </Field>

        <Field label="On click">
          <Select
            value={interactions.clickAction ?? 'select'}
            onValueChange={(v) =>
              patchInteractions({
                clickAction: v as SectionInteractions['clickAction'],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="select">Select / toggle</SelectItem>
              <SelectItem value="drillIn">Drill into sub-sections</SelectItem>
              <SelectItem value="url">Open URL</SelectItem>
              <SelectItem value="event">Fire custom event</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {interactions.clickAction === 'url' && (
          <Field label="URL">
            <Input
              value={interactions.url ?? ''}
              placeholder="https://…"
              onChange={(e) => patchInteractions({ url: e.target.value || undefined })}
            />
          </Field>
        )}
        {interactions.clickAction === 'event' && (
          <Field label="Event name">
            <Input
              value={interactions.eventName ?? ''}
              placeholder="eskat:section-click"
              onChange={(e) =>
                patchInteractions({ eventName: e.target.value || undefined })
              }
            />
          </Field>
        )}
        <SliderField
          label="Hover scale"
          suffix={`${(interactions.hoverScale ?? 1).toFixed(2)}×`}
        >
          <Slider
            value={[(interactions.hoverScale ?? 1) * 100]}
            min={80}
            max={140}
            step={1}
            onValueChange={([v]) => patchInteractions({ hoverScale: v / 100 })}
            onValueCommit={() => commitHistory()}
          />
        </SliderField>
      </Group>

      <div className="hairline" />

      {!container && (
        <Group heading="Seats">
          <Field label="Seat icon">
            <IconPicker
              value={section.seatIcon ?? 'chair'}
              onChange={(v) => updateSection(section.id, { seatIcon: v as SeatIcon })}
              customIcon={section.customSeatIcon}
              onCustomChange={(icon) =>
                updateSection(section.id, { customSeatIcon: icon })
              }
            />
          </Field>

          <div
            className="flex items-center justify-between rounded-sm px-2.5 py-2"
            style={{
              background: 'var(--bg-panel-raised)',
              border: '1px solid var(--border)',
            }}
          >
            <Label>Show label on canvas</Label>
            <Switch
              checked={section.labelVisible}
              onCheckedChange={(v) => updateSection(section.id, { labelVisible: v })}
            />
          </div>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onGenerateSeats?.(section.id)}
          >
            <Rows size={14} />
            Generate seats
            <span
              className="mono-label mono-label--tight ml-auto pl-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {section.seats.length} placed
            </span>
          </Button>

          {section.seats.length > 0 && (
            <Button
              variant="soft"
              className="w-full"
              onClick={() => {
                if (
                  confirm(`Remove all ${section.seats.length} seats from "${section.name}"?`)
                ) {
                  clearSectionSeats(section.id);
                }
              }}
            >
              <Broom size={14} />
              Clear all seats
            </Button>
          )}

          {section.seats.length === 0 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => convertToContainer(section.id)}
            >
              <TreeStructure size={14} />
              Convert to container
            </Button>
          )}
        </Group>
      )}

      {container && (
        <Group heading="Container">
          <p
            className="rounded-sm p-3 text-[11.5px] leading-relaxed"
            style={{
              background: 'var(--bg-panel-raised)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Container section with {section.children!.length} sub-section
            {section.children!.length === 1 ? '' : 's'}. Seat generation is
            disabled on containers.
          </p>
          <Button variant="secondary" className="w-full" onClick={() => drillInto(section.id)}>
            <SignIn size={14} />
            Enter container
          </Button>
        </Group>
      )}

      <div className="hairline" />

      <Group heading="Scale">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scaleSection(section.id, 1 / 1.1)}
            title="Shrink by 10% (Ctrl+Shift+-)"
          >
            <MagnifyingGlassMinus size={13} />
            −10%
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => scaleSection(section.id, 1.1)}
            title="Grow by 10% (Ctrl+Shift+=)"
          >
            <MagnifyingGlassPlus size={13} />
            +10%
          </Button>
        </div>
      </Group>

      <Button
        variant="destructive"
        className="w-full"
        onClick={() => removeSection(section.id)}
      >
        <Trash size={14} />
        Delete section
      </Button>
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

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
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
