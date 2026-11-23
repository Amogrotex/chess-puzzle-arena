import { useEffect, useState, type ReactNode } from 'react';
import Board from './Board';
import { useApp } from '../store/AppContext';
import { Avatar, Spinner } from './ui';
import { BADGES, MoveBadge } from './MoveBadge';
import { useI18n } from '../lib/i18n';
import type { Phase } from '../hooks/usePuzzle';
import type { Session } from '../lib/api';
import type { BadgeKind } from './MoveBadge';
import { MoveBadgeLabel } from './MoveBadge';

interface Props {
  session: Session | null;
  fen: string;
  phase: Phase;
  lastMove: { from: string; to: string } | null;
  arrows: { from: string; to: string; color?: string }[];
  hintSquare: string | null;
  shake: boolean;
  badge?: { square: string; kind: BadgeKind } | null;
  badges?: { square: string; kind: BadgeKind }[];
  ratingDelta: number | null;
  onMove: (m: { from: string; to: string; promotion?: string }) => void;
  controls?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
  statusOverride?: ReactNode;
  /** keeps the board inside the viewport, like the real thing */
  maxHeightOffset?: string;
}

export default function PuzzleBoard({
  session,
  fen,
  phase,
  lastMove,
  arrows,
  hintSquare,
  shake,
  badge,
  badges = [],
  ratingDelta,
  onMove,
  controls,
  footer,
  compact,
  statusOverride,
  maxHeightOffset = '21rem',
}: Props) {
  const { t } = useI18n();
  const { user } = useApp();

  // chess.com-style "Brilliant!" / "Best move" pop-up above the board
  const [announce, setAnnounce] = useState<BadgeKind | null>(null);
  useEffect(() => {
    const kind = badges[0]?.kind;
    if (!kind || kind === 'forced') {
      setAnnounce(null);
      return;
    }
    setAnnounce(kind);
    const id = window.setTimeout(() => setAnnounce(null), 1500);
    return () => window.clearTimeout(id);
  }, [badges]);
  const orientation = session?.orientation ?? 'white';
  const interactive = phase === 'ready';
  const yourTurn = session?.turn;

  const status = (() => {
    if (statusOverride) return statusOverride;
    switch (phase) {
      case 'loading':
        return (
          <span className="flex items-center gap-2 text-ink-200">
            <Spinner /> {t('trainer.loading')}
          </span>
        );
      case 'opponent':
        return <span className="text-ink-200">{t('trainer.opponentMove')}</span>;
      case 'solved':
        return (
          <span className="flex items-center gap-2 font-bold text-grass-300">
            {badge ? <MoveBadgeLabel kind={badge.kind} /> : <span className="text-lg">✓</span>} {t('trainer.solved')}
            {ratingDelta !== null && (
              <span className={`mono rounded px-1.5 text-sm ${ratingDelta >= 0 ? 'text-grass-300' : 'text-red-300'}`}>
                {ratingDelta >= 0 ? '+' : ''}
                {ratingDelta}
              </span>
            )}
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-2 font-bold text-red-300">
            <span className="text-lg">✕</span> {t('trainer.notQuite')}
          </span>
        );
      case 'revealed':
        return <span className="font-semibold text-amber-300">{t('trainer.solutionShown')}</span>;
      case 'error':
        return <span className="text-red-300">{t('common.error')}</span>;
      default:
        return (
          <span className="flex items-center gap-2 font-semibold text-white">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-grass-400" />
            {t('trainer.yourMove')} ·{' '}
            {yourTurn === 'w' ? t('trainer.white') : t('trainer.black')}
          </span>
        );
    }
  })();

  return (
    <div className="card overflow-hidden">
      {/* opponent */}
      {session && (
        <div className="flex items-center gap-2.5 px-3 py-2">
          <Avatar name={session.opponent.name} size={compact ? 30 : 36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold text-white">{session.opponent.name}</span>
              {session.opponent.title && (
                <span className="rounded bg-red-500/20 px-1 text-[10px] font-bold text-red-300">
                  {session.opponent.title}
                </span>
              )}
            </div>
            <div className="text-[11px] text-ink-300">
              <span className="mono">{session.opponent.rating}</span> · {t('trainer.puzzleRating')}
            </div>
          </div>
          <span className="chip">{session.themes[0]?.replace(/([A-Z])/g, ' $1')}</span>
        </div>
      )}

      <div
        className={`relative mx-auto w-full px-2 sm:px-3 ${compact ? 'pb-1' : 'pb-2'}`}
        style={{ maxWidth: `min(100%, calc(100vh - ${maxHeightOffset}), 660px)` }}
      >
        {announce && (
          <div className="pointer-events-none absolute left-1/2 top-2 z-40 -translate-x-1/2 animate-popIn">
            <span
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-extrabold text-white shadow-pop"
              style={{ background: `linear-gradient(180deg, ${BADGES[announce].color}, ${BADGES[announce].color}cc)` }}
            >
              <MoveBadge kind={announce} size={18} />
              {BADGES[announce].label}!
            </span>
          </div>
        )}
        <Board
          fen={fen || '8/8/8/8/8/8/8/8 w - - 0 1'}
          orientation={orientation}
          interactive={interactive}
          lastMove={lastMove}
          arrows={arrows}
          hintSquare={hintSquare}
          badges={badges.length ? badges : badge ? [badge] : []}
          shake={shake}
          onMove={onMove}
        />
      </div>

      {/* you */}
      {session && (
        <div className="flex items-center gap-2.5 px-3 py-1.5">
          <Avatar name={user?.username ?? 'You'} size={compact ? 30 : 36} ring="green" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-white">{user?.username ?? t('common.you')}</div>
            <div className="text-[11px] text-ink-300">
              <span className="mono">{session.yourRating}</span> · {t('trainer.yourRating')}
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-[42px] items-center justify-between gap-2 border-t border-ink-600 bg-ink-750 px-3 py-2 text-sm">
        {status}
        {footer}
      </div>

      {controls && <div className="border-t border-ink-600 bg-ink-700 px-2 py-2">{controls}</div>}
    </div>
  );
}
