import { useState } from 'react';
import { Copy, Check } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  code: string;
  language?: string;
}

/**
 * A minimal, dependency-free code viewer used inside the landing demo window.
 * Plain <pre> keeps the landing bundle lean — the in-app export dialog uses
 * the same approach. The Copy button floats top-right so it never shifts the
 * code below. The pane fills its parent so the demo window can keep its
 * aspect ratio across Preview/Code tabs.
 */
export function CodePane({ code, language = 'tsx' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Copy failed — select and copy manually');
    }
  };

  return (
    <div className="relative h-full w-full">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 z-[5] flex h-7 items-center gap-1.5 rounded-pill px-2.5 text-[11px] font-medium transition-[background-color,color,transform] duration-base ease-soft-spring active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        style={{
          background: copied ? 'var(--accent-soft)' : 'rgba(23,23,23,0.85)',
          border: '1px solid var(--border-strong)',
          color: copied ? 'var(--accent)' : 'var(--text-secondary)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        {copied ? (
          <>
            <Check size={12} weight="bold" />
            Copied
          </>
        ) : (
          <>
            <Copy size={12} weight="bold" />
            Copy
          </>
        )}
      </button>

      <ScrollArea
        className="h-full w-full"
        style={{ background: 'var(--bg-canvas)' }}
      >
        <pre
          className="m-0 px-5 py-4 font-mono text-[12px] leading-[1.65]"
          style={{
            color: 'var(--text-secondary)',
            whiteSpace: 'pre',
            tabSize: 2,
          }}
          data-language={language}
        >
          <code>{code}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}
