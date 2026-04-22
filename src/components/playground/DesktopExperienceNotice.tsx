import { useCallback, useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';

const STORAGE_KEY = 'eskat_playground_desktop_notice_dismissed';
const MOBILE_MQ = '(max-width: 767px)';

/**
 * Shown on small viewports: playground is built for pointer + keyboard + wide layout.
 */
export function DesktopExperienceNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      /* ignore */
    }

    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => {
      try {
        if (sessionStorage.getItem(STORAGE_KEY) === '1') {
          setVisible(false);
          return;
        }
      } catch {
        /* ignore */
      }
      setVisible(mq.matches);
    };

    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  if (!visible) return null;

  return (
    <div
      className="flex shrink-0 items-start gap-3 border-b px-4 py-3 md:hidden"
      style={{
        background: 'var(--bg-panel-raised)',
        borderColor: 'var(--border)',
      }}
      role="status"
      aria-live="polite"
    >
      <p className="min-w-0 flex-1 text-[13px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
          Desktop recommended.
        </span>{' '}
        The playground is optimized for large screens, precise pointer input, and keyboard shortcuts. For the best
        editing experience, please open this page on a computer or a tablet in landscape orientation.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-sm p-1 transition-colors duration-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        style={{ color: 'var(--text-muted)' }}
        aria-label="Dismiss notice"
      >
        <X size={18} weight="bold" />
      </button>
    </div>
  );
}
