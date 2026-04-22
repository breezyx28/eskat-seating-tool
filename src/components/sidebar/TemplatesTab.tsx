import { useState } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import type { VenueData } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ConcertPreview,
  StadiumPreview,
  TheatrePreview,
  CinemaPreview,
  ArenaPreview,
} from '@/components/previews/TemplatePreviews';

// Templates are loaded lazily on click so we don't bloat the bundle.
const TEMPLATE_LOADERS: Record<string, () => Promise<VenueData>> = {
  concert: () => import('@/templates/concert.json').then((m) => m.default as VenueData),
  stadium: () => import('@/templates/stadium.json').then((m) => m.default as VenueData),
  theatre: () => import('@/templates/theatre.json').then((m) => m.default as VenueData),
  arena: () => import('@/templates/arena.json').then((m) => m.default as VenueData),
  cinema: () => import('@/templates/cinema-complex.json').then((m) => m.default as VenueData),
};

interface TemplateCard {
  id: keyof typeof TEMPLATE_LOADERS;
  name: string;
  description: string;
  preview: React.ReactNode;
  meta: string;
}

const TEMPLATES: TemplateCard[] = [
  {
    id: 'concert',
    name: 'Concert',
    description: 'Semicircular arcs with VIP pit',
    preview: <ConcertPreview />,
    meta: '~1.2k seats',
  },
  {
    id: 'stadium',
    name: 'Stadium',
    description: 'Horseshoe layout around pitch',
    preview: <StadiumPreview />,
    meta: '~18k seats',
  },
  {
    id: 'theatre',
    name: 'Theatre',
    description: 'Orchestra / mezzanine / balcony',
    preview: <TheatrePreview />,
    meta: '~820 seats',
  },
  {
    id: 'arena',
    name: 'Arena',
    description: 'Concentric oval rings',
    preview: <ArenaPreview />,
    meta: '~6k seats',
  },
  {
    id: 'cinema',
    name: 'Cinema complex',
    description: 'Six halls — drill in to edit',
    preview: <CinemaPreview />,
    meta: 'nested',
  },
];

export function TemplatesTab() {
  const loadVenueData = useCanvasStore((s) => s.loadVenueData);
  const hasContent = useCanvasStore((s) => s.venueData.sections.length > 0);
  const [pending, setPending] = useState<TemplateCard | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const applyTemplate = async (t: TemplateCard) => {
    try {
      setLoadingId(t.id);
      const data = await TEMPLATE_LOADERS[t.id]();
      loadVenueData(data);
      toast.success(`${t.name} template loaded`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to load ${t.name} template`);
    } finally {
      setLoadingId(null);
    }
  };

  const handleClick = (t: TemplateCard) => {
    if (hasContent) {
      setPending(t);
    } else {
      void applyTemplate(t);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="mono-label">Starter venues</span>
        <span
          className="text-[10px] tab-num"
          style={{ color: 'var(--text-faint)' }}
        >
          {TEMPLATES.length}
        </span>
      </div>

      <div className="space-y-2">
        {TEMPLATES.map((t) => {
          const loading = loadingId === t.id;
          return (
            <button
              key={t.id}
              className="w-full rounded-md overflow-hidden text-left transition-[border-color,background-color,transform] duration-base ease-soft-spring hover:border-[var(--border-strong)] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]"
              style={{
                background: 'var(--bg-panel-raised)',
                border: '1px solid var(--border)',
                opacity: loading ? 0.6 : 1,
              }}
              onClick={() => handleClick(t)}
              disabled={loading}
            >
              <div
                className="h-24 flex items-center justify-center border-b"
                style={{
                  background: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {t.preview}
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="text-[13px] font-medium tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t.name}
                  </div>
                  <div
                    className="text-[11px] truncate"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {loading ? 'Loading…' : t.description}
                  </div>
                </div>
                <span
                  className="mono-label mono-label--tight shrink-0 px-1.5 h-4 inline-flex items-center rounded-sm"
                  style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {t.meta}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Load template?</DialogTitle>
            <DialogDescription>
              Your current venue will be replaced by the {pending?.name} template. This
              can be undone with <Kbd>Ctrl</Kbd>+<Kbd>Z</Kbd>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (pending) void applyTemplate(pending);
                setPending(null);
              }}
            >
              Replace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="mono-label mono-label--tight inline-flex items-center px-1 h-4 rounded-sm mx-0.5"
      style={{
        background: 'var(--bg-panel-raised)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </kbd>
  );
}

