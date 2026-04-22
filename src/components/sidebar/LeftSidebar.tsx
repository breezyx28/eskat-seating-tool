import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShapesTab } from './ShapesTab';
import { TemplatesTab } from './TemplatesTab';
import { LayersTab } from './LayersTab';

interface LeftSidebarProps {
  polygonActive: boolean;
  onStartPolygon: () => void;
}

export function LeftSidebar({ polygonActive, onStartPolygon }: LeftSidebarProps) {
  return (
    <aside
      className="w-64 shrink-0 flex flex-col border-r"
      style={{
        background: 'var(--bg-panel)',
        borderColor: 'var(--border)',
      }}
      aria-label="Design tools"
    >
      {/* Panel header — gives the sidebar a consistent top chrome */}
      <div
        className="flex items-center justify-between px-4 h-10 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="mono-label">Design</span>
      </div>

      <Tabs defaultValue="shapes" className="flex flex-col h-full">
        <div className="px-3 pt-3">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="shapes">Shapes</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="layers">Layers</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="shapes" className="mt-0 px-1">
            <ShapesTab polygonActive={polygonActive} onStartPolygon={onStartPolygon} />
          </TabsContent>
          <TabsContent value="templates" className="mt-0 px-1">
            <TemplatesTab />
          </TabsContent>
          <TabsContent value="layers" className="mt-0 px-1">
            <LayersTab />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}
