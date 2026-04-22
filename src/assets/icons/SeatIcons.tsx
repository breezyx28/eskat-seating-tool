import type { SeatIcon } from '@/types';

interface IconProps {
  color?: string;
  size?: number;
  className?: string;
}

export function ChairFullIcon({ color = 'currentColor', size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <rect x="4" y="2" width="16" height="5" rx="2" fill={color} />
      <rect x="5" y="9" width="14" height="9" rx="2" fill={color} />
      <rect x="2" y="8" width="4" height="10" rx="1.5" fill={color} opacity="0.85" />
      <rect x="18" y="8" width="4" height="10" rx="1.5" fill={color} opacity="0.85" />
      <rect x="6" y="18" width="3" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="15" y="18" width="3" height="4" rx="1" fill={color} opacity="0.7" />
    </svg>
  );
}

export function ChairSimpleIcon2({ color = 'currentColor', size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="3" width="16" height="14" rx="3" fill={color} />
      <rect x="4" y="17" width="4" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="16" y="17" width="4" height="4" rx="1" fill={color} opacity="0.7" />
    </svg>
  );
}

export function CircleSeatIcon({ color = 'currentColor', size = 20, className }: IconProps) {
  return (
    <div
      className={className}
      style={{ width: size, height: size, background: color, borderRadius: '50%' }}
    />
  );
}

export function RoundedSeatIcon({ color = 'currentColor', size = 20, className }: IconProps) {
  return (
    <div
      className={className}
      style={{ width: size, height: size, background: color, borderRadius: 4 }}
    />
  );
}

export function SquareSeatIcon({ color = 'currentColor', size = 20, className }: IconProps) {
  return (
    <div
      className={className}
      style={{ width: size, height: size, background: color }}
    />
  );
}

export interface SeatIconOption {
  value: SeatIcon;
  label: string;
  icon: React.ComponentType<IconProps>;
}

export const SEAT_ICON_OPTIONS: SeatIconOption[] = [
  { value: 'chair', label: 'Chair', icon: ChairFullIcon },
  { value: 'chair-simple', label: 'Simple chair', icon: ChairSimpleIcon2 },
  { value: 'circle', label: 'Circle', icon: CircleSeatIcon },
  { value: 'rounded', label: 'Rounded', icon: RoundedSeatIcon },
  { value: 'square', label: 'Square', icon: SquareSeatIcon },
];

export function SeatIconRenderer({
  icon,
  color,
  size,
  className,
}: {
  icon: SeatIcon;
  color?: string;
  size?: number;
  className?: string;
}) {
  const option = SEAT_ICON_OPTIONS.find((o) => o.value === icon) ?? SEAT_ICON_OPTIONS[0];
  const C = option.icon;
  return <C color={color} size={size} className={className} />;
}
