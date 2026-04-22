import { useRef } from 'react';
import type { SeatIcon, CustomSeatIcon } from '@/types';
import { SEAT_ICON_OPTIONS } from '@/assets/icons/SeatIcons';
import { sanitizeSvg, dataUrlToSvg } from '@/utils/sanitizeSvg';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface IconPickerProps {
  value: SeatIcon;
  onChange: (v: SeatIcon) => void;
  customIcon?: CustomSeatIcon;
  onCustomChange?: (icon: CustomSeatIcon | undefined) => void;
  className?: string;
}

/**
 * Max allowed SVG/PNG upload size in bytes. Icons live inline in the venue
 * JSON so we deliberately keep this small.
 */
const MAX_ICON_BYTES = 128 * 1024;

export function IconPicker({ value, onChange, customIcon, onCustomChange, className }: IconPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_ICON_BYTES) {
      toast.error('Icon must be smaller than 128 KB');
      return;
    }
    try {
      if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
        const raw = await file.text();
        const clean = sanitizeSvg(raw);
        if (!clean) {
          toast.error('Could not parse that SVG');
          return;
        }
        onCustomChange?.({ svg: clean, name: file.name });
        onChange('custom');
        toast.success(`Custom icon ${file.name} ready`);
        return;
      }
      if (file.type.startsWith('image/')) {
        const dataUrl = await readAsDataUrl(file);
        onCustomChange?.({ svg: dataUrlToSvg(dataUrl), name: file.name });
        onChange('custom');
        toast.success(`Custom icon ${file.name} ready`);
        return;
      }
      toast.error('Only SVG or image files are supported');
    } catch (err) {
      console.error(err);
      toast.error('Could not read that file');
    }
  };

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) await handleFile(file);
  };

  return (
    <div className={cn('grid grid-cols-6 gap-1.5', className)}>
      {SEAT_ICON_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.label}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center justify-center aspect-square rounded-sm',
              'transition-[background-color,border-color,color,transform] duration-base ease-soft-spring',
              'hover:border-[var(--border-strong)] active:translate-y-[1px]',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]'
            )}
            style={{
              background: active ? 'var(--accent-soft)' : 'var(--bg-panel-raised)',
              border: `1px solid ${active ? 'var(--accent-border)' : 'var(--border)'}`,
              color: active ? 'var(--accent)' : 'var(--text-secondary)',
            }}
            aria-pressed={active}
          >
            <Icon size={18} color="currentColor" />
          </button>
        );
      })}

      <button
        type="button"
        title={customIcon ? `Custom: ${customIcon.name ?? 'upload'}` : 'Upload custom icon'}
        onClick={() => {
          if (customIcon) {
            onChange('custom');
          } else {
            fileRef.current?.click();
          }
        }}
        onDoubleClick={() => fileRef.current?.click()}
        onContextMenu={(e) => {
          e.preventDefault();
          fileRef.current?.click();
        }}
        className={cn(
          'flex items-center justify-center aspect-square rounded-sm relative',
          'transition-[background-color,border-color,color,transform] duration-base ease-soft-spring',
          'hover:border-[var(--border-strong)] active:translate-y-[1px]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-panel)]'
        )}
        style={{
          background:
            value === 'custom' ? 'var(--accent-soft)' : 'var(--bg-panel-raised)',
          border: `1px ${customIcon ? 'solid' : 'dashed'} ${value === 'custom' ? 'var(--accent-border)' : 'var(--border)'}`,
          color: value === 'custom' ? 'var(--accent)' : 'var(--text-muted)',
        }}
        aria-pressed={value === 'custom'}
      >
        {customIcon?.svg ? (
          <div
            style={{ width: 18, height: 18 }}
            dangerouslySetInnerHTML={{ __html: customIcon.svg }}
          />
        ) : (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v12" />
            <path d="m8 11 4-4 4 4" />
            <path d="M8 21h8a2 2 0 0 0 2-2v-3" />
            <path d="M6 16v3a2 2 0 0 0 2 2" />
          </svg>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/svg+xml,.svg,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleInput}
      />
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}
