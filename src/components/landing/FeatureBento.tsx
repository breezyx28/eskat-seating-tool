import type { ReactNode } from 'react';

interface FeatureCardProps {
  eyebrow: string;
  title: string;
  body: string;
  preview: ReactNode;
  className?: string;
}

function FeatureCard({ eyebrow, title, body, preview, className = '' }: FeatureCardProps) {
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-lg p-8 transition-colors duration-base ease-soft-spring ${className}`}
      style={{
        background: 'var(--bg-panel-raised)',
        border: '1px solid var(--border)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div className="flex-1">
        <div className="h-[180px] w-full">{preview}</div>
      </div>
      <div className="mt-8 flex flex-col gap-2">
        <span className="mono-label">{eyebrow}</span>
        <h3
          className="display-heading"
          style={{ fontSize: '22px', color: 'var(--text-primary)' }}
        >
          {title}
        </h3>
        <p
          className="text-[14px] leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

// --- Inline micro previews ----------------------------------------------------

function DrillInPreview() {
  return (
    <svg viewBox="0 0 360 180" className="h-full w-full">
      <defs>
        <pattern id="fb-dots" x="0" y="0" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#2a2a2a" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="360" height="180" fill="#0f0f0f" rx="6" />
      <rect x="0" y="0" width="360" height="180" fill="url(#fb-dots)" rx="6" />

      {/* Outer container */}
      <rect
        x="24"
        y="24"
        width="312"
        height="132"
        rx="6"
        fill="#151f1a"
        stroke="#363636"
        strokeDasharray="3 3"
      />
      <rect x="24" y="8" width="70" height="16" rx="3" fill="#0f0f0f" stroke="#2e2e2e" />
      <text x="32" y="19" fill="#b4b4b4" fontSize="9" fontFamily="Geist Mono" letterSpacing="1">
        CINEMA
      </text>

      {/* Inner rooms */}
      {[0, 1, 2].map((c) =>
        [0, 1].map((r) => {
          const isSelected = c === 1 && r === 0;
          return (
            <g key={`${c}-${r}`}>
              <rect
                x={40 + c * 100}
                y={44 + r * 56}
                width="84"
                height="48"
                rx="4"
                fill={isSelected ? '#1a2420' : '#1d1d1d'}
                stroke={isSelected ? '#3ecf8e' : '#363636'}
                strokeWidth={isSelected ? 1.5 : 1}
              />
              {/* seat dots */}
              {Array.from({ length: 6 }).map((_, si) => (
                <circle
                  key={si}
                  cx={46 + c * 100 + si * 12}
                  cy={60 + r * 56}
                  r="1.8"
                  fill={isSelected ? '#3ecf8e' : '#898989'}
                />
              ))}
              {Array.from({ length: 6 }).map((_, si) => (
                <circle
                  key={`b-${si}`}
                  cx={46 + c * 100 + si * 12}
                  cy={74 + r * 56}
                  r="1.8"
                  fill={isSelected ? '#3ecf8e' : '#898989'}
                />
              ))}
            </g>
          );
        })
      )}
    </svg>
  );
}

function FitSeatsPreview() {
  return (
    <svg viewBox="0 0 240 180" className="h-full w-full">
      <defs>
        <clipPath id="fb-circle-clip">
          <circle cx="120" cy="90" r="68" />
        </clipPath>
      </defs>
      <circle
        cx="120"
        cy="90"
        r="68"
        fill="#1a2420"
        stroke="#3ecf8e"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />
      <g clipPath="url(#fb-circle-clip)">
        {Array.from({ length: 10 }).map((_, row) =>
          Array.from({ length: 14 }).map((_, col) => {
            const x = 40 + col * 12;
            const y = 30 + row * 12;
            return <circle key={`${row}-${col}`} cx={x} cy={y} r="2.4" fill="#3ecf8e" fillOpacity={0.7} />;
          })
        )}
      </g>
      <circle
        cx="120"
        cy="90"
        r="68"
        fill="none"
        stroke="#3ecf8e"
        strokeWidth="1.5"
        strokeOpacity="0.9"
      />
    </svg>
  );
}

function PatternsPreview() {
  return (
    <svg viewBox="0 0 240 180" className="h-full w-full">
      <defs>
        <pattern id="fb-stripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#898989" strokeWidth="1.5" />
        </pattern>
        <pattern id="fb-check" patternUnits="userSpaceOnUse" width="10" height="10">
          <rect width="5" height="5" fill="#b4b4b4" />
          <rect x="5" y="5" width="5" height="5" fill="#b4b4b4" />
        </pattern>
      </defs>
      {/* Stripes shape */}
      <rect x="16" y="28" width="96" height="64" rx="4" fill="url(#fb-stripes)" stroke="#363636" />
      {/* Check shape */}
      <rect x="128" y="28" width="96" height="64" rx="4" fill="url(#fb-check)" fillOpacity="0.24" stroke="#363636" />
      {/* Bezier curve path */}
      <path
        d="M16,140 C60,100 180,180 224,140"
        fill="none"
        stroke="#3ecf8e"
        strokeWidth="2"
      />
      {/* Control handles */}
      <circle cx="60" cy="100" r="3.5" fill="#3ecf8e" />
      <circle cx="180" cy="180" r="3.5" fill="#3ecf8e" />
      <circle cx="16" cy="140" r="3" fill="#fafafa" />
      <circle cx="224" cy="140" r="3" fill="#fafafa" />
      <line x1="16" y1="140" x2="60" y2="100" stroke="#3ecf8e" strokeOpacity="0.4" strokeDasharray="2 2" />
      <line x1="224" y1="140" x2="180" y2="180" stroke="#3ecf8e" strokeOpacity="0.4" strokeDasharray="2 2" />
    </svg>
  );
}

function CustomIconsPreview() {
  const icons = [
    <path key="chair" d="M18,22 L18,12 Q18,8 22,8 L28,8 Q32,8 32,12 L32,22 M14,22 L36,22 L36,30 L14,30 Z" />,
    <rect key="sq" x="14" y="10" width="22" height="22" rx="2" />,
    <circle key="c" cx="25" cy="22" r="11" />,
    <path
      key="star"
      d="M25,10 L28,18 L37,18 L30,23 L33,32 L25,27 L17,32 L20,23 L13,18 L22,18 Z"
    />,
    <path key="heart" d="M25,32 L15,22 Q12,18 15,15 Q18,12 22,16 L25,19 L28,16 Q32,12 35,15 Q38,18 35,22 Z" />,
    <path key="crown" d="M14,30 L16,14 L22,22 L25,12 L28,22 L34,14 L36,30 Z" />,
  ];
  return (
    <svg viewBox="0 0 300 180" className="h-full w-full">
      {icons.map((glyph, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const isSelected = i === 0;
        return (
          <g
            key={i}
            transform={`translate(${40 + col * 72}, ${24 + row * 72})`}
          >
            <rect
              width="50"
              height="50"
              rx="6"
              fill={isSelected ? '#1a2420' : '#1d1d1d'}
              stroke={isSelected ? '#3ecf8e' : '#363636'}
              strokeWidth={isSelected ? 1.5 : 1}
            />
            <g
              fill="none"
              stroke={isSelected ? '#3ecf8e' : '#b4b4b4'}
              strokeWidth="1.5"
              strokeLinejoin="round"
            >
              {glyph}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

function CanvasLockPreview() {
  return (
    <svg viewBox="0 0 240 180" className="h-full w-full">
      <defs>
        <pattern id="fb-dots-lock" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#2a2a2a" />
        </pattern>
      </defs>
      <rect x="10" y="10" width="220" height="160" rx="8" fill="#0f0f0f" />
      <rect x="10" y="10" width="220" height="160" rx="8" fill="url(#fb-dots-lock)" />

      {/* Inset emerald halo */}
      <rect
        x="14"
        y="14"
        width="212"
        height="152"
        rx="6"
        fill="none"
        stroke="#3ecf8e"
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />
      <rect
        x="18"
        y="18"
        width="204"
        height="144"
        rx="4"
        fill="none"
        stroke="#3ecf8e"
        strokeWidth="0.8"
        strokeOpacity="0.22"
      />

      {/* Center lock chip */}
      <rect x="78" y="78" width="84" height="24" rx="12" fill="#0f0f0f" stroke="#3ecf8e" strokeOpacity="0.32" />
      <g transform="translate(90,84)" fill="none" stroke="#3ecf8e" strokeWidth="1.5">
        <rect x="0" y="4" width="12" height="10" rx="1.5" />
        <path d="M2,4 V2 Q2,-1 6,-1 Q10,-1 10,2 V4" />
      </g>
      <text
        x="122"
        y="94"
        fill="#3ecf8e"
        fontSize="9"
        fontFamily="Geist Mono"
        letterSpacing="1"
      >
        CANVAS LOCKED
      </text>

      {/* Kbd chip */}
      <g transform="translate(90,138)">
        <rect width="60" height="18" rx="3" fill="#1d1d1d" stroke="#363636" />
        <text
          x="30"
          y="12"
          fill="#fafafa"
          fontSize="9"
          fontFamily="Geist Mono"
          textAnchor="middle"
          letterSpacing="1"
        >
          Ctrl + L
        </text>
      </g>
    </svg>
  );
}

export function FeatureBento() {
  return (
    <section
      id="features"
      className="relative"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:py-28">
        <div className="mb-12 flex flex-col gap-4 md:max-w-[640px]">
          <span className="mono-label">Features</span>
          <h2
            className="display-heading"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '-0.03em',
              textWrap: 'balance',
            }}
          >
            Every tool you need to map a real venue — nothing you don't.
          </h2>
        </div>

        {/* Row 1 — 60/40 split */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <FeatureCard
            className="md:col-span-3"
            eyebrow="Nested venues"
            title="Drag. Draw. Drill in."
            body="Group related sections into a container and double-click to enter it. Child layouts keep their own transforms, so a cinema with six halls edits exactly like one."
            preview={<DrillInPreview />}
          />
          <FeatureCard
            className="md:col-span-2"
            eyebrow="Fit seats"
            title="Fit seats to any shape"
            body="Rectangles, circles, ellipses, polygons, arcs — the seat generator clips a chair grid to the bounds so you don't hand-place rows."
            preview={<FitSeatsPreview />}
          />
        </div>

        {/* Row 2 — 3 columns */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <FeatureCard
            eyebrow="Shape edits"
            title="Patterns & bezier edges"
            body="Stripe or checkerboard fills, rounded corners, bezier-edited polygons — the real SVG ships with your export."
            preview={<PatternsPreview />}
          />
          <FeatureCard
            eyebrow="Iconography"
            title="Custom seat icons"
            body="Swap the default chair for any glyph. Per-section icons drive both the canvas and the exported component."
            preview={<CustomIconsPreview />}
          />
          <FeatureCard
            eyebrow="Stable workflow"
            title="Lock the canvas"
            body="A single Ctrl+L freezes everything on the canvas. Great for reviewing a layout without nudging a section 2px to the left by accident."
            preview={<CanvasLockPreview />}
          />
        </div>
      </div>
    </section>
  );
}
