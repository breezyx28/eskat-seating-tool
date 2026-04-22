import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { EditorPreview } from './EditorPreview';

export function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      {/* Dot-grid backdrop — matches the canvas dot pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          opacity: 0.18,
          maskImage:
            'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,0,0,0.9), transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,0,0,0.9), transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 px-6 py-20 md:grid-cols-[3fr_2fr] md:py-28">
        <div className="flex flex-col gap-7">
          <div className="flex items-center gap-2">
            <span
              className="brand-chip mono-label rounded-pill px-2.5 py-1"
              style={{ fontSize: '10px' }}
            >
              v0.9 · Preview
            </span>
            <span className="mono-label" style={{ color: 'var(--text-muted)' }}>
              Zero runtime deps
            </span>
          </div>

          <h1
            className="display-heading"
            style={{
              fontSize: 'clamp(2.75rem, 6vw, 4.5rem)',
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              textWrap: 'balance',
            }}
          >
            Design seat maps.
            <br />
            Ship a{' '}
            <span style={{ color: 'var(--accent)' }}>React component</span>.
          </h1>

          <p
            className="max-w-[54ch] text-[15px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Eskat is a Figma-style designer for theatres, arenas, cinemas, and anything
            with rows and seats. Draw sections, fit chairs to any shape, nest layouts,
            then export a self-contained <code className="text-[13px]">.tsx</code> you
            can drop into your booking flow.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link to="/playground">
                Open playground
                <ArrowRight size={14} weight="bold" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="#features">Explore features</a>
            </Button>
            <span
              className="mono-label hidden md:inline"
              style={{ color: 'var(--text-muted)', marginLeft: 8 }}
            >
              No sign-up · Works offline
            </span>
          </div>
        </div>

        <div className="relative">
          <EditorPreview />
          {/* Tiny floating spec chip on the preview corner */}
          <div
            className="absolute -bottom-3 -left-3 hidden rounded-sm px-2.5 py-1.5 md:block"
            style={{
              background: 'var(--bg-panel-raised)',
              border: '1px solid var(--border)',
            }}
          >
            <span className="mono-label" style={{ color: 'var(--text-muted)' }}>
              Theatre · 840 seats · nested
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
