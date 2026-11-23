/**
 * Chess.com-style move quality badges (brilliant / great / best / …) that pop
 * up on the destination square of a piece.
 */

export type BadgeKind =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'forced';

interface BadgeStyle {
  glyph: string;
  color: string;
  ring: string;
  label: string;
  icon: 'check' | 'exclaim' | 'doubleExclaim' | 'question' | 'doubleQuestion' | 'book' | 'arrows' | 'thumb';
}

export const BADGES: Record<BadgeKind, BadgeStyle> = {
  brilliant: { glyph: '!!', color: '#1baca6', ring: '#7fe6e0', label: 'Brilliant', icon: 'doubleExclaim' },
  great: { glyph: '!', color: '#5c8bb0', ring: '#a8cbe2', label: 'Great move', icon: 'exclaim' },
  best: { glyph: '✓', color: '#81b64c', ring: '#c4e79a', label: 'Best move', icon: 'check' },
  good: { glyph: '✓', color: '#95bb4a', ring: '#cde3a1', label: 'Good', icon: 'thumb' },
  book: { glyph: '📖', color: '#a88865', ring: '#d4bda3', label: 'Book', icon: 'book' },
  inaccuracy: { glyph: '?!', color: '#e9c227', ring: '#f7e69a', label: 'Inaccuracy', icon: 'question' },
  mistake: { glyph: '?', color: '#e58f2a', ring: '#f7c894', label: 'Mistake', icon: 'question' },
  blunder: { glyph: '??', color: '#ca3431', ring: '#f0a9a7', label: 'Blunder', icon: 'doubleQuestion' },
  forced: { glyph: '⇉', color: '#8b877f', ring: '#c3bfb6', label: 'Forced', icon: 'arrows' },
};

function Glyph({ icon, size }: { icon: BadgeStyle['icon']; size: number }) {
  const s = size * 0.55;
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: '#fff', strokeWidth: 3.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (icon) {
    case 'check':
      return (
        <svg {...common}>
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
      );
    case 'exclaim':
      return (
        <svg {...common}>
          <path d="M12 4v10" />
          <circle cx="12" cy="19.5" r="1.4" fill="#fff" stroke="none" />
        </svg>
      );
    case 'doubleExclaim':
      return (
        <svg {...common} strokeWidth={3}>
          <path d="M8 4v9M16 4v9" />
          <circle cx="8" cy="19" r="1.3" fill="#fff" stroke="none" />
          <circle cx="16" cy="19" r="1.3" fill="#fff" stroke="none" />
        </svg>
      );
    case 'question':
      return (
        <svg {...common} strokeWidth={3}>
          <path d="M8.5 8.5a3.5 3.5 0 116.2 2.3c-.9 1-2.2 1.5-2.2 3.2" />
          <circle cx="12.3" cy="19.3" r="1.3" fill="#fff" stroke="none" />
        </svg>
      );
    case 'doubleQuestion':
      return (
        <svg {...common} strokeWidth={2.6}>
          <path d="M5.5 7.5a2.6 2.6 0 114.5 1.8c-.7.7-1.6 1.1-1.6 2.2" />
          <circle cx="8.4" cy="16.4" r="1.1" fill="#fff" stroke="none" />
          <path d="M13.9 7.5a2.6 2.6 0 114.5 1.8c-.7.7-1.6 1.1-1.6 2.2" />
          <circle cx="16.8" cy="16.4" r="1.1" fill="#fff" stroke="none" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common} strokeWidth={2.4}>
          <path d="M5 4.5h9a3 3 0 013 3v12H8a3 3 0 01-3-3z" />
          <path d="M17 7.5h2v12h-2" />
        </svg>
      );
    case 'arrows':
      return (
        <svg {...common} strokeWidth={3}>
          <path d="M6 9l4 4-4 4M14 9l4 4-4 4" />
        </svg>
      );
    case 'thumb':
    default:
      return (
        <svg {...common}>
          <path d="M4 12.5l5 5L20 6.5" />
        </svg>
      );
  }
}

/** The round badge itself. `size` is the diameter in px. */
export function MoveBadge({
  kind,
  size = 22,
  className = '',
}: {
  kind: BadgeKind;
  size?: number;
  className?: string;
}) {
  const style = BADGES[kind];
  return (
    <span
      className={`inline-flex select-none items-center justify-center rounded-full shadow-[0_1px_3px_rgba(0,0,0,.45)] ring-1 ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(120% 120% at 30% 20%, ${style.ring}, ${style.color} 62%)`,
        boxShadow: `0 0 0 1.5px rgba(255,255,255,.55), 0 2px 6px rgba(0,0,0,.45)`,
        ['--tw-ring-color' as string]: style.color,
      }}
      title={style.label}
      aria-label={style.label}
    >
      <Glyph icon={style.icon} size={size} />
    </span>
  );
}

/** Text version, e.g. for the status bar or a move list. */
export function MoveBadgeLabel({ kind, className = '' }: { kind: BadgeKind; className?: string }) {
  const style = BADGES[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 font-bold ${className}`} style={{ color: style.color }}>
      <MoveBadge kind={kind} size={16} />
      {style.label}
    </span>
  );
}
