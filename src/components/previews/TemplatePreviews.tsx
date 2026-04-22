// Inline SVG thumbnails of the bundled venue templates. Shared between the
// sidebar Templates tab and the landing-page output showcase so the two stay
// visually in sync.

export function ConcertPreview() {
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <rect x="40" y="6" width="40" height="8" rx="2" fill="#2e2e2e" />
      <path d="M20,50 A40,40 0 0 1 100,50" stroke="#898989" strokeWidth="3" fill="none" />
      <path d="M25,50 A30,30 0 0 1 95,50" stroke="#b4b4b4" strokeWidth="3" fill="none" />
      <path d="M30,50 A20,20 0 0 1 90,50" stroke="#efefef" strokeWidth="3" fill="none" />
      <circle cx="60" cy="42" r="6" fill="#3ecf8e" />
    </svg>
  );
}

export function StadiumPreview() {
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <rect
        x="35"
        y="22"
        width="50"
        height="16"
        rx="2"
        fill="#242424"
        stroke="#3ecf8e"
        strokeWidth="0.6"
      />
      <rect x="20" y="10" width="80" height="6" rx="2" fill="#898989" />
      <rect x="20" y="44" width="80" height="6" rx="2" fill="#898989" />
      <rect x="10" y="18" width="6" height="24" rx="2" fill="#b4b4b4" />
      <rect x="104" y="18" width="6" height="24" rx="2" fill="#b4b4b4" />
    </svg>
  );
}

export function TheatrePreview() {
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <rect x="30" y="48" width="60" height="6" rx="1" fill="#2e2e2e" />
      <path d="M15,40 Q60,30 105,40" stroke="#efefef" strokeWidth="2.5" fill="none" />
      <path d="M18,30 Q60,20 102,30" stroke="#b4b4b4" strokeWidth="2.5" fill="none" />
      <path d="M22,20 Q60,10 98,20" stroke="#898989" strokeWidth="2.5" fill="none" />
      <circle cx="60" cy="52" r="1.5" fill="#3ecf8e" />
    </svg>
  );
}

export function CinemaPreview() {
  const palette = ['#898989', '#b4b4b4', '#efefef', '#898989', '#b4b4b4', '#efefef'];
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => {
          const stroke = palette[r * 3 + c];
          return (
            <rect
              key={`${c}-${r}`}
              x={10 + c * 35}
              y={6 + r * 25}
              width="30"
              height="20"
              rx="3"
              fill="#1d1d1d"
              stroke={stroke}
              strokeWidth="1"
              strokeOpacity={0.8}
            />
          );
        })
      )}
      <rect x="26" y="54" width="68" height="3" rx="1" fill="#3ecf8e" fillOpacity="0.6" />
    </svg>
  );
}

export function ArenaPreview() {
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <ellipse cx="60" cy="30" rx="40" ry="22" stroke="#898989" strokeWidth="1.6" fill="none" />
      <ellipse cx="60" cy="30" rx="30" ry="16" stroke="#b4b4b4" strokeWidth="1.6" fill="none" />
      <ellipse cx="60" cy="30" rx="20" ry="10" stroke="#efefef" strokeWidth="1.6" fill="none" />
      <ellipse cx="60" cy="30" rx="10" ry="5" fill="#3ecf8e" fillOpacity="0.7" />
    </svg>
  );
}

export interface TemplateShowcaseItem {
  id: 'theatre' | 'concert' | 'stadium' | 'arena' | 'cinema';
  name: string;
  description: string;
  meta: string;
  Preview: () => React.JSX.Element;
}

export const TEMPLATE_SHOWCASE: TemplateShowcaseItem[] = [
  {
    id: 'theatre',
    name: 'Theatre',
    description: 'Orchestra · mezzanine · balcony',
    meta: '~820 seats',
    Preview: TheatrePreview,
  },
  {
    id: 'concert',
    name: 'Concert',
    description: 'Semicircular arcs with VIP pit',
    meta: '~1.2k seats',
    Preview: ConcertPreview,
  },
  {
    id: 'stadium',
    name: 'Stadium',
    description: 'Horseshoe layout around the pitch',
    meta: '~18k seats',
    Preview: StadiumPreview,
  },
  {
    id: 'arena',
    name: 'Arena',
    description: 'Concentric oval rings',
    meta: '~6k seats',
    Preview: ArenaPreview,
  },
  {
    id: 'cinema',
    name: 'Cinema complex',
    description: 'Six halls — drill in to edit',
    meta: 'nested',
    Preview: CinemaPreview,
  },
];
