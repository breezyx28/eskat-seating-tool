import { useEffect } from 'react';
import { LandingNav } from '@/components/landing/LandingNav';
import { Hero } from '@/components/landing/Hero';
import { StatsStrip } from '@/components/landing/StatsStrip';
import { FeatureBento } from '@/components/landing/FeatureBento';
import { OutputShowcase } from '@/components/landing/OutputShowcase';
import { TemplateDemo } from '@/components/landing/TemplateDemo';
import { ExportCallout } from '@/components/landing/ExportCallout';
import { ShortcutGrid } from '@/components/landing/ShortcutGrid';
import { PlaygroundCTA } from '@/components/landing/PlaygroundCTA';
import { LandingFooter } from '@/components/landing/LandingFooter';

// The editor CSS hard-locks <html>/<body> to `overflow: hidden` so the canvas
// never introduces page-level scrollbars. The landing page is a document, not
// an app, so it needs to scroll. We toggle the lock while this route is
// mounted and restore it on unmount so the playground remains unaffected.
function useUnlockPageScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');

    const prev = {
      htmlOverflow: html.style.overflow,
      htmlHeight: html.style.height,
      bodyOverflow: body.style.overflow,
      bodyHeight: body.style.height,
      rootHeight: root?.style.height ?? '',
      rootMinHeight: root?.style.minHeight ?? '',
      rootDisplay: root?.style.display ?? '',
    };

    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    if (root) {
      root.style.height = 'auto';
      root.style.minHeight = '100dvh';
      root.style.display = 'block';
    }

    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.height = prev.htmlHeight;
      body.style.overflow = prev.bodyOverflow;
      body.style.height = prev.bodyHeight;
      if (root) {
        root.style.height = prev.rootHeight;
        root.style.minHeight = prev.rootMinHeight;
        root.style.display = prev.rootDisplay;
      }
    };
  }, []);
}

export default function Landing() {
  useUnlockPageScroll();

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col"
      style={{ background: 'var(--bg-app)' }}
    >
      <LandingNav />
      <main className="flex flex-1 flex-col">
        <Hero />
        <StatsStrip />
        <FeatureBento />
        <OutputShowcase />
        <TemplateDemo />
        <ExportCallout />
        <ShortcutGrid />
        <PlaygroundCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
