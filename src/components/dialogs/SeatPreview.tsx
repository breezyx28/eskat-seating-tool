import { useMemo } from 'react';
import type { Seat, SeatIcon, CustomSeatIcon } from '@/types';
import { ChairIcon, ChairSimpleIcon } from '@/assets/icons/ChairIcon';

interface SeatPreviewProps {
  seats: Seat[];
  width: number;
  height: number;
  icon: SeatIcon;
  customIcon?: CustomSeatIcon;
  className?: string;
  accentColor?: string;
}

export function SeatPreview({
  seats,
  width,
  height,
  icon,
  customIcon,
  className,
  accentColor = 'var(--seat-available)',
}: SeatPreviewProps) {
  const fitted = useMemo(() => {
    if (seats.length === 0) return { scale: 1, offsetX: 0, offsetY: 0 };
    const maxX = Math.max(...seats.map((s) => s.bounds.x + s.bounds.width));
    const maxY = Math.max(...seats.map((s) => s.bounds.y + s.bounds.height));
    const scale = Math.min((width - 8) / maxX, (height - 8) / maxY, 1);
    const offsetX = (width - maxX * scale) / 2;
    const offsetY = (height - maxY * scale) / 2;
    return { scale, offsetX, offsetY };
  }, [seats, width, height]);

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: 'relative',
        background: 'var(--bg-canvas)',
        overflow: 'hidden',
      }}
    >
      {seats.length === 0 ? (
        <div
          className="absolute inset-0 flex items-center justify-center mono-label"
          style={{ color: 'var(--text-muted)' }}
        >
          Adjust rows & columns
        </div>
      ) : (
        seats.map((seat) => {
          const x = fitted.offsetX + seat.bounds.x * fitted.scale;
          const y = fitted.offsetY + seat.bounds.y * fitted.scale;
          const size = Math.max(2, Math.min(seat.bounds.width, seat.bounds.height) * fitted.scale);
          return (
            <div
              key={seat.id}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: size,
                height: size,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon === 'chair' && <ChairIcon color={accentColor} size={size} />}
              {icon === 'chair-simple' && <ChairSimpleIcon color={accentColor} size={size} />}
              {icon === 'circle' && (
                <div
                  style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: accentColor,
                  }}
                />
              )}
              {icon === 'square' && (
                <div style={{ width: size, height: size, background: accentColor }} />
              )}
              {icon === 'rounded' && (
                <div
                  style={{
                    width: size,
                    height: size,
                    background: accentColor,
                    borderRadius: 4,
                  }}
                />
              )}
              {icon === 'custom' && customIcon?.svg && (
                <div
                  style={{ width: size, height: size, color: accentColor }}
                  dangerouslySetInnerHTML={{ __html: customIcon.svg }}
                />
              )}
            </div>
          );
        })
      )}
      <div
        className="absolute bottom-1.5 right-2 mono-label mono-label--tight tab-num"
        style={{ color: 'var(--text-muted)' }}
      >
        {seats.length} seat{seats.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}
