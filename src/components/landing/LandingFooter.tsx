import { Link } from 'react-router-dom';
import { BrandLogo } from '@/assets/icons/BrandLogo';
import { README_ANCHORS } from '@/lib/repoLinks';

interface Column {
  title: string;
  items: { label: string; href?: string; external?: boolean; to?: string }[];
}

const COLUMNS: Column[] = [
  {
    title: 'Product',
    items: [
      { label: 'Playground', to: '/playground' },
      { label: 'Features', href: README_ANCHORS.featureHighlights, external: true },
      { label: 'Shortcuts', href: README_ANCHORS.keyboardShortcuts, external: true },
    ],
  },
  {
    title: 'Templates',
    items: [
      { label: 'Theatre', href: README_ANCHORS.templates, external: true },
      { label: 'Concert', href: README_ANCHORS.templates, external: true },
      { label: 'Stadium', href: README_ANCHORS.templates, external: true },
      { label: 'Cinema', href: README_ANCHORS.templates, external: true },
    ],
  },
  {
    title: 'Developer',
    items: [
      { label: 'Export format', href: README_ANCHORS.exportedComponent, external: true },
      { label: 'venue.config.ts', href: README_ANCHORS.exportedComponent, external: true },
      { label: 'JSON schema', href: README_ANCHORS.coreConcepts, external: true },
    ],
  },
  {
    title: 'About',
    items: [
      { label: 'Changelog', href: README_ANCHORS.roadmap, external: true },
      { label: 'Roadmap', href: README_ANCHORS.roadmap, external: true },
      { label: 'License', href: README_ANCHORS.license, external: true },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer
      className="relative"
      style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-panel)' }}
    >
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <BrandLogo size={26} style={{ color: 'var(--accent)' }} />
              <span
                className="mono-label"
                style={{ color: 'var(--text-primary)' }}
              >
                Eskat Seating
              </span>
            </div>
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: 'var(--text-muted)', maxWidth: '30ch' }}
            >
              Design seat maps, ship a React component.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="mono-label">{col.title}</span>
              <ul className="flex flex-col gap-2">
                {col.items.map((item) => (
                  <li key={`${col.title}-${item.label}`}>
                    {item.to ? (
                      <Link
                        to={item.to}
                        className="text-[13px] transition-colors duration-base"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        {...(item.external
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                        className="text-[13px] transition-colors duration-base"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-12 flex flex-col items-start justify-between gap-2 pt-6 md:flex-row md:items-center"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <span
            className="mono-label"
            style={{ color: 'var(--text-muted)' }}
          >
            © {new Date().getFullYear()} · Eskat Seating Design Tool
          </span>
          <span
            className="mono-label tab-num"
            style={{ color: 'var(--text-muted)' }}
          >
            v0.9.0 · Preview
          </span>
        </div>
      </div>
    </footer>
  );
}
