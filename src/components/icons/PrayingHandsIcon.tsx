interface PrayingHandsIconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export function PrayingHandsIcon({
  className,
  size = 24,
  strokeWidth = 1.75,
  style,
}: PrayingHandsIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M12 2c-1.2 1.8-3 4.5-3 7v7a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V9c0-2.5-1.8-5.2-3-7z" />
      <path d="M12 2v16" />
      <path d="M9 10c-1.1 0-2 .9-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-5c0-1.1-.9-2-2-2" />
    </svg>
  );
}
