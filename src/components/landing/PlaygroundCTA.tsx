import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { DotGrid } from './DotGrid';

export function PlaygroundCTA() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-20 md:py-28">
        <div
          className="relative overflow-hidden rounded-lg px-8 py-16 md:py-24"
          style={{
            background: 'var(--bg-panel-raised)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Interactive dot-grid backdrop */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,1) 75%)',
              maskImage:
                'radial-gradient(ellipse 55% 65% at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,1) 75%)',
            }}
            aria-hidden
          >
            <DotGrid
              dotSize={4}
              gap={22}
              baseColor="#2e2e2e"
              activeColor="#3ecf8e"
              proximity={120}
              shockRadius={250}
              shockStrength={3}
              resistance={750}
              returnDuration={1.5}
              style={{ opacity: 0.6 }}
            />
          </div>

          <div className="relative flex flex-col items-center gap-6 text-center">
            <span
              className="brand-chip mono-label rounded-pill px-3 py-1"
              style={{ fontSize: '10px' }}
            >
              Ready when you are
            </span>
            <h2
              className="display-heading"
              style={{
                fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                letterSpacing: '-0.03em',
                textWrap: 'balance',
                maxWidth: '18ch',
              }}
            >
              Open the playground.
            </h2>
            <p
              className="max-w-[48ch] text-[15px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Everything on this page is a click away. No sign-up, no install. Your
              work auto-saves to the browser.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button asChild variant="primary" size="lg">
                <Link to="/playground">
                  Open playground
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <a href="#templates">Browse templates</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
