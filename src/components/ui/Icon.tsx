// Icon component ported from TaskPilot design (2026-04-20).
// Single-path SVG icons — stroke-based, currentColor.
// 24x24 viewBox, stroke-width configurable (default 1.7).

export type IconName =
  | 'sparkle' | 'calendar' | 'book' | 'settings' | 'search' | 'refresh'
  | 'chevronLeft' | 'chevronRight' | 'chevronDown' | 'check' | 'x' | 'plus'
  | 'mapPin' | 'clock' | 'sun' | 'cloud' | 'external' | 'bookmark'
  | 'thumbUp' | 'thumbDown' | 'filter' | 'slash' | 'arrowUp' | 'menu'
  | 'inbox' | 'stack' | 'logo' | 'activity' | 'globe' | 'flame'
  | 'heart' | 'moon' | 'dumbbell' | 'camera' | 'star' | 'trending';

const PATHS: Record<IconName, string> = {
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
  calendar: 'M7 3v4M17 3v4M3 10h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z',
  book: 'M4 5a2 2 0 012-2h6v18H6a2 2 0 01-2-2V5zM12 3h6a2 2 0 012 2v14a2 2 0 01-2 2h-6V3z',
  settings: 'M12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM19 12a7 7 0 00-.1-1.2l2.1-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.6 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2.1 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2.1 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.6-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2.1-1.6c.1-.4.1-.8.1-1.2z',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  refresh: 'M3 12a9 9 0 0115.6-6.2M21 3v6h-6M21 12a9 9 0 01-15.6 6.2M3 21v-6h6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  chevronDown: 'M6 9l6 6 6-6',
  check: 'M5 12l4 4L20 6',
  x: 'M18 6L6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  mapPin: 'M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z',
  clock: 'M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  sun: 'M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  cloud: 'M7 18a5 5 0 110-10 6 6 0 0111.7 1.5A4.5 4.5 0 0118 18H7z',
  external: 'M14 3h7v7M10 14L21 3M21 14v7h-7M10 3H3v18h18',
  bookmark: 'M6 3h12v18l-6-4-6 4V3z',
  thumbUp: 'M7 10v10M7 10l3-7a2 2 0 013 2v5h5a2 2 0 012 2l-1 7a2 2 0 01-2 2H7',
  thumbDown: 'M17 14V4M17 14l-3 7a2 2 0 01-3-2v-5H6a2 2 0 01-2-2l1-7a2 2 0 012-2h10',
  filter: 'M4 6h16M7 12h10M10 18h4',
  slash: 'M4 20L20 4',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  menu: 'M3 6h18M3 12h18M3 18h18',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5 6h14l3 6v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6l3-6z',
  stack: 'M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4',
  logo: 'M6 4h12M6 12h12M6 20h12',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18',
  flame: 'M12 2s5 5 5 10a5 5 0 01-10 0c0-2 1-4 2-5 0 2 1 3 2 3 0-3 1-6 1-8z',
  heart: 'M12 21s-7-4.5-9.5-9A5 5 0 0112 6a5 5 0 019.5 6c-2.5 4.5-9.5 9-9.5 9z',
  moon: 'M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z',
  dumbbell: 'M6 5v14M4 8v8M10 8v8M14 8v8M20 5v14M18 8v8M10 12h4',
  camera: 'M4 7h3l2-3h6l2 3h3a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1zM12 17a4 4 0 100-8 4 4 0 000 8z',
  star: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.9L12 16.5l-5.3 2.7 1-5.9L3.4 9.2l5.9-.9L12 3z',
  trending: 'M3 17l6-6 4 4 8-8M21 7h-5M21 7v5',
};

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
}

export function Icon({ name, size = 16, stroke = 1.7, className }: IconProps) {
  const d = PATHS[name] ?? '';
  const segments = d.split('M').filter(Boolean);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {segments.map((seg, i) => (
        <path key={i} d={'M' + seg} />
      ))}
    </svg>
  );
}
