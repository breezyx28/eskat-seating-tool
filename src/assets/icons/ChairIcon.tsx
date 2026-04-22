interface ChairIconProps {
  color?: string;
  size?: number;
  className?: string;
}

export function ChairIcon({ color = 'currentColor', size = 20, className }: ChairIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
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

export function ChairSimpleIcon({ color = 'currentColor', size = 20, className }: ChairIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="4" y="3" width="16" height="14" rx="3" fill={color} />
      <rect x="4" y="17" width="4" height="4" rx="1" fill={color} opacity="0.7" />
      <rect x="16" y="17" width="4" height="4" rx="1" fill={color} opacity="0.7" />
    </svg>
  );
}

export function WheelchairIcon({
  color = 'currentColor',
  size = 10,
  className,
}: ChairIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="10" cy="4" r="2" fill={color} />
      <path
        d="M9 7v5h5l3 4m-5-4-2 5m-4-9a6 6 0 1 0 5 10"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
