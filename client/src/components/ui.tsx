import type { ReactNode } from 'react';

const AVATAR_COLORS = [
  ['#81b64c', '#4c7a2e'],
  ['#5b9bd5', '#2c5d8f'],
  ['#c9a227', '#8a6d10'],
  ['#b5651d', '#7d3f0d'],
  ['#a259b8', '#6b2f7d'],
  ['#4c9b8f', '#2b6a61'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function Avatar({
  name,
  size = 40,
  ring,
}: {
  name: string;
  size?: number;
  ring?: 'green' | 'grey';
}) {
  const [c1, c2] = AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
  const initials = name.replace(/[^a-zA-Z\u0600-\u06FF]/g, '').slice(0, 2).toUpperCase() || '?';
  return (
    <div
      className={`shrink-0 select-none rounded-md font-bold text-white/95 shadow-inner ${
        ring === 'green' ? 'ring-2 ring-grass-400' : ring === 'grey' ? 'ring-1 ring-ink-500' : ''
      }`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${c1}, ${c2})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-750 px-3 py-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">{label}</div>
      <div className="mono text-lg font-bold text-white">{value}</div>
      {hint && <div className="text-[11px] text-ink-300">{hint}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-sm font-bold uppercase tracking-widest text-ink-300">{children}</h2>
      {right}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink-400 border-t-grass-300 ${className}`}
      aria-label="loading"
    />
  );
}

export function Knight({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 45 45" aria-hidden>
      <g fill="none" fillRule="evenodd" stroke="#81b64c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#81b64c" stroke="#4c7a2e" />
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#eeeed2" stroke="#4c7a2e" />
        <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#eeeed2" />
        <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#eeeed2" strokeWidth="1.1" />
      </g>
    </svg>
  );
}

export function RatingChart({
  data,
  height = 120,
  className = '',
}: {
  data: { t: number; rating: number }[];
  height?: number;
  className?: string;
}) {
  if (data.length < 2) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed border-ink-500 text-xs text-ink-400 ${className}`}
        style={{ height }}
      >
        —
      </div>
    );
  }
  const width = 320;
  const pad = 6;
  const ratings = data.map((d) => d.rating);
  const lo = Math.min(...ratings);
  const hi = Math.max(...ratings);
  // keep the curve readable when the rating barely moves
  const vpad = Math.max(12, (hi - lo) * 0.15);
  const min = lo - vpad;
  const max = hi + vpad;
  const span = Math.max(1, max - min);
  const xs = (i: number) => pad + (i / (data.length - 1)) * (width - pad * 2);
  const ys = (r: number) => height - pad - ((r - min) / span) * (height - pad * 2);
  const points = data.map((d, i) => `${xs(i)},${ys(d.rating)}`).join(' ');
  const area = `${pad},${height - pad} ${points} ${width - pad},${height - pad}`;
  const last = data[data.length - 1].rating;
  const up = last >= data[0].rating;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`w-full ${className}`} style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={up ? '#81b64c' : '#d4553f'} stopOpacity="0.35" />
          <stop offset="100%" stopColor={up ? '#81b64c' : '#d4553f'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#ratingFill)" />
      <polyline
        points={points}
        fill="none"
        stroke={up ? '#81b64c' : '#d4553f'}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={xs(data.length - 1)} cy={ys(last)} r="3" fill={up ? '#b6e076' : '#f08d7c'} />
    </svg>
  );
}
