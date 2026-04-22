import { Link } from 'react-router-dom';
import { ArrowUpRight } from '@phosphor-icons/react';
import { TEMPLATE_SHOWCASE } from '@/components/previews/TemplatePreviews';

export function OutputShowcase() {
  return (
    <section
      id="templates"
      className="relative"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:py-28">
        <div className="mb-12 flex flex-col gap-4 md:max-w-[640px]">
          <span className="mono-label">Output</span>
          <h2
            className="display-heading"
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              letterSpacing: '-0.03em',
              textWrap: 'balance',
            }}
          >
            See what you'll ship.
          </h2>
          <p
            className="max-w-[54ch] text-[15px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Five built-in templates cover the long tail of event layouts. Load one in
            the playground, tweak rows or seat counts, then export.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {TEMPLATE_SHOWCASE.map((tpl) => {
            const Preview = tpl.Preview;
            return (
              <Link
                key={tpl.id}
                to="/playground"
                className="group relative flex flex-col overflow-hidden rounded-lg transition-all duration-base ease-soft-spring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                style={{
                  background: 'var(--bg-panel-raised)',
                  border: '1px solid var(--border)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-strong)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  className="flex aspect-[120/60] w-full items-center justify-center p-4"
                  style={{ background: 'var(--bg-canvas)' }}
                >
                  <Preview />
                </div>
                <div
                  className="flex items-center justify-between gap-2 px-4 py-3"
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="mono-label"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {tpl.name}
                    </span>
                    <span
                      className="tab-num truncate text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {tpl.meta}
                    </span>
                  </div>
                  <ArrowUpRight
                    size={14}
                    weight="bold"
                    className="shrink-0 transition-transform duration-base ease-soft-spring group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
