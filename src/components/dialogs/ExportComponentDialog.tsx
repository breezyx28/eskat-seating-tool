import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useCanvasStore } from '@/store/canvasStore';
import { exportAsReactComponent, downloadReactComponent } from '@/utils/exportComponent';
import {
  generateConfigSource,
  configFromVenueData,
  downloadConfig,
} from '@/utils/configTemplate';
import { Copy, DownloadSimple, Code, Info, Gear, Package } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ExportComponentDialog({ open, onClose }: Props) {
  const venueData = useCanvasStore((s) => s.venueData);
  const [componentName, setComponentName] = useState('SeatMap');

  const source = useMemo(() => {
    if (!open) return '';
    return exportAsReactComponent(venueData, sanitizeName(componentName));
  }, [venueData, componentName, open]);

  const configSource = useMemo(() => {
    if (!open) return '';
    return generateConfigSource(configFromVenueData(venueData));
  }, [venueData, open]);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  };

  const handleDownload = () => {
    downloadReactComponent(venueData, sanitizeName(componentName));
    toast.success(`Downloaded ${sanitizeName(componentName)}.tsx`);
  };

  const handleDownloadConfig = () => {
    downloadConfig(configFromVenueData(venueData));
    toast.success('Downloaded venue.config.ts');
  };

  const handleDownloadAll = () => {
    downloadReactComponent(venueData, sanitizeName(componentName));
    setTimeout(() => downloadConfig(configFromVenueData(venueData)), 250);
    toast.success('Downloaded component + config');
  };

  const sizeKb = (new Blob([source]).size / 1024).toFixed(1);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code size={18} weight="bold" style={{ color: 'var(--accent)' }} />
            Export as React Component
          </DialogTitle>
          <DialogDescription>
            A self-contained, dependency-free <code className="font-mono text-[12px]">.tsx</code>{' '}
            file ready to drop into any React project.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5 flex-1 min-w-[200px]">
            <Label>Component name</Label>
            <Input
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              placeholder="SeatMap"
            />
          </div>
          <Button variant="secondary" onClick={() => handleCopy(source, 'Component')}>
            <Copy size={14} />
            Copy
          </Button>
          <Button variant="secondary" onClick={handleDownload}>
            <DownloadSimple size={14} />
            .tsx
          </Button>
          <Button variant="secondary" onClick={handleDownloadConfig}>
            <Gear size={14} />
            config
          </Button>
          <Button variant="primary" onClick={handleDownloadAll}>
            <Package size={14} weight="bold" />
            Download both
          </Button>
        </div>

        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">
              <span className="truncate max-w-[180px]">
                {sanitizeName(componentName)}.tsx
              </span>
            </TabsTrigger>
            <TabsTrigger value="config">venue.config.ts</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>
          <TabsContent value="preview">
            <ScrollArea
              className="h-[360px] rounded-md"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-app)' }}
            >
              <pre
                className="p-4 text-[11px] leading-relaxed font-mono overflow-x-auto"
                style={{ color: 'var(--text-secondary)' }}
              >
                {source}
              </pre>
            </ScrollArea>
            <div
              className="flex items-center gap-3 mt-2 mono-label mono-label--tight"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="tab-num">{sizeKb} KB</span>
              <span className="hairline--vertical h-3" />
              <span className="tab-num">{source.split('\n').length} lines</span>
              <span className="hairline--vertical h-3" />
              <span className="tab-num">{venueData.sections.length} sections</span>
              <span className="hairline--vertical h-3" />
              <span className="tab-num">
                {venueData.sections.reduce((n, s) => n + s.seats.length, 0)} seats
              </span>
            </div>
          </TabsContent>
          <TabsContent value="config">
            <ScrollArea
              className="h-[360px] rounded-md"
              style={{ border: '1px solid var(--border)', background: 'var(--bg-app)' }}
            >
              <pre
                className="p-4 text-[11px] leading-relaxed font-mono overflow-x-auto"
                style={{ color: 'var(--text-secondary)' }}
              >
                {configSource}
              </pre>
            </ScrollArea>
            <div
              className="flex items-center justify-between gap-3 mt-2"
              style={{ color: 'var(--text-muted)' }}
            >
              <span className="text-[11px]">
                Sidecar file — integrators can tweak colors, zoom bounds, and layout without
                touching the component.
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(configSource, 'Config')}
              >
                <Copy size={12} /> Copy
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="usage">
            <div
              className="space-y-4 p-4 rounded-md text-[13px] leading-relaxed"
              style={{
                background: 'var(--bg-panel-raised)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <div className="flex items-start gap-2">
                <Info
                  size={14}
                  weight="bold"
                  className="mt-0.5 shrink-0"
                  style={{ color: 'var(--accent)' }}
                />
                <p>
                  Save the downloaded file (e.g.{' '}
                  <code className="font-mono text-[12px]">{sanitizeName(componentName)}.tsx</code>)
                  anywhere in your React project. It has no dependencies other than React.
                </p>
              </div>
              <pre
                className="p-3 rounded-sm text-[11.5px] font-mono overflow-x-auto"
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >{`import ${sanitizeName(componentName)} from './${sanitizeName(componentName)}';

export default function App() {
  return (
    <div style={{ height: '100dvh' }}>
      <${sanitizeName(componentName)}
        maxSelectable={4}
        initialSeatStates={{ /* "seat-id": "reserved" */ }}
        onSelectionChange={(ids) => console.log('Selected:', ids)}
        onSeatSelect={(id, info) =>
          console.log(\`Clicked \${info.label} (\${info.sectionName}) — \${info.currency}\${info.price}\`)
        }
      />
    </div>
  );
}`}</pre>
              <div>
                <div
                  className="mono-label mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Props
                </div>
                <ul className="space-y-1.5 text-[12px]">
                  <li>
                    <code className="font-mono">initialSeatStates</code> — override seat states
                    (e.g. reserved) at runtime.
                  </li>
                  <li>
                    <code className="font-mono">onSeatSelect(id, info)</code> — fires on every
                    seat click.
                  </li>
                  <li>
                    <code className="font-mono">onSelectionChange(ids)</code> — fires when the
                    selection array changes.
                  </li>
                  <li>
                    <code className="font-mono">readOnly</code> — disables selection entirely.
                  </li>
                  <li>
                    <code className="font-mono">maxSelectable</code> — caps selection length.
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '').replace(/^[0-9]+/, '');
  if (!cleaned) return 'SeatMap';
  return cleaned[0].toUpperCase() + cleaned.slice(1);
}
