import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  label?: string;
  className?: string;
  id?: string;
}

/**
 * Color input with a swatch + hex field. The underlying native color picker
 * fires onChange continuously while dragging — we pass that through for a
 * live preview on the canvas.
 */
export function ColorPicker({
  value,
  onChange,
  onCommit,
  className,
  id,
}: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Strip alpha for the native picker — we store 6 or 8-char hex
  const baseHex = value.length > 7 ? value.slice(0, 7) : value;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <button
          type="button"
          className={cn(
            'w-[26px] h-[26px] rounded-sm border shrink-0',
            'transition-[border-color,transform] duration-base ease-soft-spring',
            'hover:border-[var(--border-emphasis)] active:scale-95',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]'
          )}
          style={{ background: value, borderColor: 'var(--border-strong)' }}
          onClick={() => inputRef.current?.click()}
          aria-label="Pick color"
        />
        <input
          ref={inputRef}
          id={id}
          type="color"
          value={baseHex}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onCommit?.(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          tabIndex={-1}
        />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
        className={cn(
          'flex-1 h-7 px-2 rounded-sm text-[11px] font-mono tab-num bg-[var(--bg-panel)]',
          'border border-[var(--border)] text-[var(--text-primary)]',
          'transition-colors duration-base ease-soft-spring',
          'hover:border-[var(--border-strong)]',
          'focus:outline-none focus:border-[var(--accent-border)] focus:bg-[var(--bg-panel-raised)]'
        )}
        maxLength={9}
      />
    </div>
  );
}
