import { Link } from 'react-router-dom';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/assets/icons/BrandLogo';
import { README_ANCHORS } from '@/lib/repoLinks';

type NavLink =
  | { kind: 'anchor'; label: string; href: string }
  | { kind: 'route'; label: string; to: string };

const LINKS: NavLink[] = [
  { kind: 'anchor', label: 'Features', href: '#features' },
  { kind: 'anchor', label: 'Templates', href: '#templates' },
  { kind: 'route', label: 'Studio', to: '/templates' },
  { kind: 'anchor', label: 'Export', href: '#export' },
];

export function LandingNav() {
  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: 'rgba(23, 23, 23, 0.84)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-6">
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity duration-base ease-soft-spring hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded-sm"
        >
          <BrandLogo size={26} style={{ color: 'var(--accent)' }} />
          <span
            className="mono-label"
            style={{ color: 'var(--text-primary)' }}
          >
            Eskat Seating
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const common = {
              className:
                'rounded-sm px-3 py-1.5 text-[13px] transition-colors duration-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
              style: { color: 'var(--text-secondary)' },
              onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                (e.currentTarget as HTMLElement).style.color =
                  'var(--text-primary)';
              },
              onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
                (e.currentTarget as HTMLElement).style.color =
                  'var(--text-secondary)';
              },
            };
            if (link.kind === 'route') {
              return (
                <Link key={link.to} to={link.to} {...common}>
                  {link.label}
                </Link>
              );
            }
            return (
              <a key={link.href} href={link.href} {...common}>
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={README_ANCHORS.quickStart}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-[13px] transition-colors duration-base md:inline"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Docs
          </a>
          <Button asChild variant="primary" size="sm">
            <Link to="/playground">
              Open playground
              <ArrowRight size={13} weight="bold" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
