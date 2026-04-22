import { useCanvasStore } from '@/store/canvasStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VenueProperties } from './VenueProperties';
import { SectionProperties } from './SectionProperties';
import { SeatProperties } from './SeatProperties';
import { MultiSelectProperties } from './MultiSelectProperties';
import { StageProperties } from './StageProperties';
import { flattenSections, findSectionById } from '@/utils/sectionTree';

interface RightSidebarProps {
  onGenerateSeats?: (sectionId: string) => void;
}

export function RightSidebar({ onGenerateSeats }: RightSidebarProps) {
  const venueData = useCanvasStore((s) => s.venueData);
  const selectedIds = useCanvasStore((s) => s.selectedIds);

  // Walk the entire section tree so selections inside nested containers are
  // reflected in the property panel.
  const selectedSectionIds: string[] = [];
  const selectedSeats: { sectionId: string; seatId: string }[] = [];
  for (const section of flattenSections(venueData.sections)) {
    if (selectedIds.includes(section.id)) selectedSectionIds.push(section.id);
    for (const seat of section.seats) {
      if (selectedIds.includes(seat.id)) {
        selectedSeats.push({ sectionId: section.id, seatId: seat.id });
      }
    }
  }

  const stageSelected = venueData.stage && selectedIds.includes(venueData.stage.id);

  let content: React.ReactNode = null;
  let headingLabel = 'Venue';

  if (selectedIds.length === 0) {
    content = <VenueProperties />;
    headingLabel = 'Venue';
  } else if (stageSelected && venueData.stage) {
    content = <StageProperties stage={venueData.stage} />;
    headingLabel = 'Stage';
  } else if (selectedSectionIds.length === 1 && selectedSeats.length === 0) {
    const section = findSectionById(venueData, selectedSectionIds[0])!;
    content = <SectionProperties section={section} onGenerateSeats={onGenerateSeats} />;
    headingLabel = 'Section';
  } else if (selectedSectionIds.length === 0 && selectedSeats.length === 1) {
    const { sectionId, seatId } = selectedSeats[0];
    const section = findSectionById(venueData, sectionId)!;
    const seat = section.seats.find((s) => s.id === seatId)!;
    content = <SeatProperties sectionId={sectionId} seat={seat} />;
    headingLabel = 'Seat';
  } else {
    content = (
      <MultiSelectProperties
        sectionIds={selectedSectionIds}
        seatSelections={selectedSeats}
      />
    );
    headingLabel = 'Multi-select';
  }

  const total = selectedSectionIds.length + selectedSeats.length;

  return (
    <aside
      className="w-80 shrink-0 flex flex-col border-l"
      style={{
        background: 'var(--bg-panel)',
        borderColor: 'var(--border)',
      }}
      aria-label="Properties"
    >
      <div
        className="flex items-center justify-between px-4 h-10 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <span className="mono-label">{headingLabel}</span>
        {total > 0 && (
          <span
            className="text-[10px] font-medium tab-num px-1.5 py-0.5 rounded-sm border"
            style={{
              background: 'var(--bg-panel-raised)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            {total} selected
          </span>
        )}
      </div>

      <ScrollArea className="flex-1">{content}</ScrollArea>
    </aside>
  );
}
