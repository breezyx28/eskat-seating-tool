export function EditorPreview() {
  return (
    <div
      className="relative aspect-[16/11] w-full overflow-hidden rounded-lg"
      style={{
        border: '1px solid var(--border)',
        background: 'var(--bg-canvas)',
      }}
    >
      <svg viewBox="0 0 800 550" className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="ep-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#2a2a2a" />
          </pattern>
        </defs>

        {/* Toolbar chrome */}
        <rect x="0" y="0" width="800" height="44" fill="#171717" />
        <line x1="0" y1="44" x2="800" y2="44" stroke="#2e2e2e" strokeWidth="1" />

        {/* Toolbar brand pill */}
        <rect x="16" y="11" width="22" height="22" rx="4" fill="#1f2d25" stroke="#3ecf8e" strokeOpacity="0.32" />
        <rect x="44" y="14" width="98" height="16" rx="2" fill="#242424" />

        {/* Toolbar actions */}
        <rect x="320" y="12" width="72" height="20" rx="10" fill="#1d1d1d" stroke="#2e2e2e" />
        <rect x="398" y="12" width="60" height="20" rx="10" fill="#1d1d1d" stroke="#2e2e2e" />
        <rect x="464" y="12" width="60" height="20" rx="10" fill="#1d1d1d" stroke="#2e2e2e" />

        {/* Export CTA */}
        <rect x="652" y="10" width="132" height="24" rx="12" fill="#0f0f0f" stroke="#fafafa" strokeWidth="0.8" />
        <rect x="668" y="19" width="88" height="6" rx="2" fill="#efefef" />

        {/* Left shapes rail */}
        <rect x="0" y="44" width="64" height="506" fill="#171717" />
        <line x1="64" y1="44" x2="64" y2="550" stroke="#2e2e2e" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <g key={i}>
            <rect
              x="14"
              y={72 + i * 52}
              width="36"
              height="36"
              rx="6"
              fill={i === 1 ? '#242424' : 'transparent'}
              stroke={i === 1 ? '#363636' : '#2e2e2e'}
            />
            {/* tiny glyph */}
            {i === 0 && <rect x="22" y="80" width="20" height="20" rx="2" fill="none" stroke="#b4b4b4" />}
            {i === 1 && <circle cx="32" cy={90 + i * 52 - 52 + 42} r="10" fill="none" stroke="#fafafa" />}
            {i === 2 && (
              <polygon
                points="22,184 42,184 38,196 26,196"
                fill="none"
                stroke="#b4b4b4"
              />
            )}
            {i === 3 && <ellipse cx="32" cy="238" rx="11" ry="7" fill="none" stroke="#b4b4b4" />}
            {i === 4 && <path d="M22,290 Q32,280 42,290" fill="none" stroke="#b4b4b4" />}
            {i === 5 && <rect x="22" y="340" width="20" height="14" rx="1" fill="none" stroke="#b4b4b4" />}
          </g>
        ))}

        {/* Canvas area (dot grid) */}
        <rect x="64" y="44" width="496" height="506" fill="#0f0f0f" />
        <rect x="64" y="44" width="496" height="506" fill="url(#ep-dots)" />

        {/* Stage rectangle */}
        <rect
          x="190"
          y="90"
          width="240"
          height="28"
          rx="3"
          fill="#1d1d1d"
          stroke="#363636"
          strokeWidth="1"
        />
        <text x="310" y="108" fill="#898989" fontSize="10" textAnchor="middle" fontFamily="Geist Mono">
          STAGE
        </text>

        {/* Orchestra — selected (emerald ring) */}
        <g>
          <rect
            x="152"
            y="150"
            width="316"
            height="88"
            rx="6"
            fill="#1a2420"
            stroke="#3ecf8e"
            strokeWidth="1.5"
          />
          {/* Tiny seat dots */}
          {Array.from({ length: 10 }).map((_, col) =>
            Array.from({ length: 4 }).map((_, row) => (
              <circle
                key={`o-${col}-${row}`}
                cx={168 + col * 30}
                cy={168 + row * 18}
                r="3"
                fill="#3ecf8e"
                fillOpacity={row === 1 && col === 5 ? 1 : 0.6}
              />
            ))
          )}
          {/* Selection label */}
          <rect x="152" y="132" width="84" height="16" rx="3" fill="#0f0f0f" stroke="#3ecf8e" strokeOpacity="0.32" />
          <text x="160" y="143" fill="#3ecf8e" fontSize="9" fontFamily="Geist Mono" letterSpacing="1">
            ORCHESTRA
          </text>
        </g>

        {/* Mezzanine — unselected */}
        <g>
          <path
            d="M100,300 Q310,260 520,300 L520,340 Q310,300 100,340 Z"
            fill="#1d1d1d"
            stroke="#363636"
            strokeWidth="1"
          />
          {Array.from({ length: 14 }).map((_, i) => (
            <circle
              key={`m-${i}`}
              cx={130 + i * 28}
              cy={310 + Math.abs(i - 6.5) * 1.6}
              r="2.5"
              fill="#898989"
            />
          ))}
        </g>

        {/* Balcony — arcs */}
        <g>
          <path d="M90,440 A220,120 0 0 1 530,440" stroke="#898989" strokeWidth="1.2" fill="none" />
          <path d="M110,460 A200,110 0 0 1 510,460" stroke="#b4b4b4" strokeWidth="1.2" fill="none" />
          <path d="M130,480 A180,100 0 0 1 490,480" stroke="#efefef" strokeWidth="1.2" fill="none" />
          {Array.from({ length: 18 }).map((_, i) => {
            const t = i / 17;
            const angle = Math.PI * (1 - t);
            const cx = 310 + Math.cos(angle) * 180;
            const cy = 480 - Math.sin(angle) * 100;
            return <circle key={`b-${i}`} cx={cx} cy={cy} r="2" fill="#b4b4b4" />;
          })}
        </g>

        {/* Right sidebar */}
        <rect x="560" y="44" width="240" height="506" fill="#171717" />
        <line x1="560" y1="44" x2="560" y2="550" stroke="#2e2e2e" />

        {/* Sidebar tabs */}
        <rect x="572" y="60" width="216" height="28" rx="6" fill="#1d1d1d" stroke="#2e2e2e" />
        <rect x="576" y="64" width="70" height="20" rx="4" fill="#242424" stroke="#363636" />
        <text x="611" y="78" fill="#fafafa" fontSize="9" textAnchor="middle" fontFamily="Geist Mono" letterSpacing="1">
          PROPS
        </text>
        <text x="692" y="78" fill="#898989" fontSize="9" textAnchor="middle" fontFamily="Geist Mono" letterSpacing="1">
          LAYERS
        </text>
        <text x="762" y="78" fill="#898989" fontSize="9" textAnchor="middle" fontFamily="Geist Mono" letterSpacing="1">
          TPL
        </text>

        {/* Label row */}
        <text x="572" y="118" fill="#898989" fontSize="9" fontFamily="Geist Mono" letterSpacing="1">
          SELECTION
        </text>
        <rect x="572" y="126" width="216" height="32" rx="6" fill="#1d1d1d" stroke="#2e2e2e" />
        <rect x="582" y="136" width="120" height="12" rx="2" fill="#efefef" />
        <rect x="710" y="136" width="68" height="12" rx="6" fill="#1f2d25" stroke="#3ecf8e" strokeOpacity="0.32" />

        {/* Field group: Position */}
        <text x="572" y="184" fill="#898989" fontSize="9" fontFamily="Geist Mono" letterSpacing="1">
          POSITION
        </text>
        <line x1="572" y1="190" x2="788" y2="190" stroke="#2e2e2e" />
        {[0, 1].map((i) => (
          <g key={`pos-${i}`}>
            <rect
              x={572 + i * 108}
              y="200"
              width="100"
              height="28"
              rx="6"
              fill="#1d1d1d"
              stroke="#2e2e2e"
            />
            <text
              x={582 + i * 108}
              y="217"
              fill="#898989"
              fontSize="9"
              fontFamily="Geist Mono"
            >
              {i === 0 ? 'X' : 'Y'}
            </text>
            <text
              x={660 + i * 108}
              y="217"
              fill="#fafafa"
              fontSize="10"
              textAnchor="end"
              fontFamily="Geist Mono"
            >
              {i === 0 ? '152' : '150'}
            </text>
          </g>
        ))}

        {/* Field group: Size */}
        <text x="572" y="260" fill="#898989" fontSize="9" fontFamily="Geist Mono" letterSpacing="1">
          SIZE
        </text>
        <line x1="572" y1="266" x2="788" y2="266" stroke="#2e2e2e" />
        {[0, 1].map((i) => (
          <g key={`sz-${i}`}>
            <rect
              x={572 + i * 108}
              y="276"
              width="100"
              height="28"
              rx="6"
              fill="#1d1d1d"
              stroke="#2e2e2e"
            />
            <text
              x={582 + i * 108}
              y="293"
              fill="#898989"
              fontSize="9"
              fontFamily="Geist Mono"
            >
              {i === 0 ? 'W' : 'H'}
            </text>
            <text
              x={660 + i * 108}
              y="293"
              fill="#fafafa"
              fontSize="10"
              textAnchor="end"
              fontFamily="Geist Mono"
            >
              {i === 0 ? '316' : '88'}
            </text>
          </g>
        ))}

        {/* Seats field */}
        <text x="572" y="336" fill="#898989" fontSize="9" fontFamily="Geist Mono" letterSpacing="1">
          SEATS
        </text>
        <line x1="572" y1="342" x2="788" y2="342" stroke="#2e2e2e" />
        <rect x="572" y="352" width="216" height="34" rx="6" fill="#1d1d1d" stroke="#2e2e2e" />
        <text x="584" y="372" fill="#fafafa" fontSize="11" fontFamily="Geist Mono" fontWeight="500">
          40
        </text>
        <text x="604" y="372" fill="#898989" fontSize="10" fontFamily="Geist">
          placed · 10 × 4 grid
        </text>

        {/* Generate CTA */}
        <rect x="572" y="402" width="216" height="32" rx="16" fill="#3ecf8e" />
        <text
          x="680"
          y="422"
          fill="#0f0f0f"
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          fontFamily="Geist"
        >
          Generate seats
        </text>

        {/* Status bar */}
        <rect x="0" y="530" width="800" height="20" fill="#171717" />
        <line x1="0" y1="530" x2="800" y2="530" stroke="#2e2e2e" />
        <text x="12" y="544" fill="#898989" fontSize="9" fontFamily="Geist Mono" letterSpacing="1">
          ZOOM 100%
        </text>
        <text x="120" y="544" fill="#898989" fontSize="9" fontFamily="Geist Mono" letterSpacing="1">
          1 SELECTED
        </text>
        <text x="260" y="544" fill="#898989" fontSize="9" fontFamily="Geist Mono" letterSpacing="1">
          OBJECTS 4
        </text>
      </svg>
    </div>
  );
}
