interface Stat {
  value: string;
  label: string;
  accent?: boolean;
}

const STATS: Stat[] = [
  { value: '0', label: 'Runtime deps', accent: true },
  { value: '5', label: 'Templates' },
  { value: '18K+', label: 'Seats rendered' },
  { value: '2', label: 'Exports · tsx + json' },
];

export function StatsStrip() {
  return (
    <section
      className="relative"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6">
        <div
          className="grid grid-cols-2 divide-x md:grid-cols-4"
          style={{ borderColor: 'var(--border)' }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col gap-2 py-10 md:py-12"
              style={{
                paddingLeft: i === 0 ? 0 : 24,
                paddingRight: 24,
                borderColor: 'var(--border)',
              }}
            >
              <span
                className="display-heading tab-num"
                style={{
                  fontSize: 'clamp(2rem, 3.6vw, 2.75rem)',
                  letterSpacing: '-0.03em',
                  color: stat.accent ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                {stat.value}
              </span>
              <span className="mono-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
