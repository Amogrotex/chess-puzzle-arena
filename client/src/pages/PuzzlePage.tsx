import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePuzzle } from '../hooks/usePuzzle';
import PuzzleBoard from '../components/PuzzleBoard';
import { MoveBadge } from '../components/MoveBadge';
import { RatingChart } from '../components/ui';
import { useApp } from '../store/AppContext';
import { useI18n, type TKey } from '../lib/i18n';
import type { MoveResponse } from '../lib/api';

const DIFFICULTIES: { id: string; key: TKey }[] = [
  { id: 'adaptive', key: 'trainer.adaptive' },
  { id: 'beginner', key: 'trainer.beginner' },
  { id: 'easy', key: 'trainer.easy' },
  { id: 'intermediate', key: 'trainer.intermediate' },
  { id: 'advanced', key: 'trainer.advanced' },
  { id: 'master', key: 'trainer.master' },
];

function prettyTheme(theme: string) {
  return theme.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

export default function PuzzlePage() {
  const { t } = useI18n();
  const { user, stats, refreshStats } = useApp();
  const [params, setParams] = useSearchParams();
  const theme = params.get('theme') ?? 'all';
  const difficulty = params.get('difficulty') ?? localStorage.getItem('puzzle-arena.difficulty') ?? 'adaptive';
  const [lastDelta, setLastDelta] = useState<number | null>(null);

  const onSolved = useCallback(
    (res: MoveResponse) => {
      setLastDelta(res.rating?.delta ?? null);
      void refreshStats();
    },
    [refreshStats],
  );
  const onFailed = useCallback(() => {
    setLastDelta(null);
    void refreshStats();
  }, [refreshStats]);

  const puzzle = usePuzzle({ mode: 'train', theme, difficulty, onSolved, onFailed });

  /* auto-advance like chess.com's "next puzzle" flow */
  useEffect(() => {
    if (puzzle.phase !== 'solved') return;
    const id = window.setTimeout(() => void puzzle.load(), 2600);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.phase, puzzle.session?.sessionId]);

  useEffect(() => {
    localStorage.setItem('puzzle-arena.difficulty', difficulty);
  }, [difficulty]);

  const setDifficulty = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('difficulty', id);
    setParams(next, { replace: true });
  };

  const history = (stats?.ratingHistory ?? []).slice(-40).map((h) => ({ t: h.t, rating: h.rating }));

  const controls = (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <button
        onClick={() => void puzzle.takeHint()}
        disabled={puzzle.phase !== 'ready' || puzzle.hintsUsed >= 3}
        className="btn-ghost !px-3 !py-1.5 text-[13px]"
        title={t('trainer.hint')}
      >
        💡 {t('trainer.hint')}
      </button>
      <button
        onClick={() => void puzzle.revealSolution()}
        disabled={puzzle.phase === 'solved' || puzzle.phase === 'revealed' || puzzle.phase === 'loading'}
        className="btn-ghost !px-3 !py-1.5 text-[13px]"
      >
        👁 {t('trainer.solution')}
      </button>
      <button
        onClick={() => void puzzle.retry()}
        disabled={!puzzle.session || puzzle.phase === 'loading' || puzzle.phase === 'ready' || puzzle.phase === 'opponent'}
        className="btn-ghost !px-3 !py-1.5 text-[13px]"
      >
        ↻ {t('trainer.retry')}
      </button>
      <button onClick={() => void puzzle.skip()} className="btn-ghost !px-3 !py-1.5 text-[13px]">
        → {t('trainer.skip')}
      </button>
      {(puzzle.phase === 'solved' || puzzle.phase === 'failed' || puzzle.phase === 'revealed') && (
        <button onClick={() => void puzzle.load()} className="btn-primary !px-4 !py-1.5 text-[13px]">
          {t('trainer.next')}
        </button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-white">{t('nav.puzzles')}</h1>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="chip">
            {theme === 'all' ? t('trainer.allThemes') : prettyTheme(theme)}
          </span>
          <button
            onClick={() => {
              const next = new URLSearchParams(params);
              next.delete('theme');
              setParams(next, { replace: true });
            }}
            className="chip hover:border-grass-400 hover:text-white"
            hidden={theme === 'all'}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <PuzzleBoard
            session={puzzle.session}
            fen={puzzle.fen}
            phase={puzzle.phase}
            lastMove={puzzle.lastMove}
            arrows={puzzle.arrows}
            hintSquare={puzzle.hintSquare}
            badges={puzzle.badges}
            shake={puzzle.shake}
            ratingDelta={puzzle.ratingDelta}
            onMove={(m) => void puzzle.playMove(m)}
            controls={controls}
          />

          {puzzle.puzzle && (puzzle.phase === 'solved' || puzzle.phase === 'failed' || puzzle.phase === 'revealed') && (
            <div className="card mt-3 animate-slideUp p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {puzzle.puzzle.themes.slice(0, 5).map((th) => (
                    <button
                      key={th}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set('theme', th);
                        setParams(next, { replace: true });
                        void puzzle.load();
                      }}
                      className="chip hover:border-grass-400 hover:text-white"
                    >
                      {prettyTheme(th)}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-300">
                  <span>
                    {t('trainer.puzzleRating')}: <b className="mono text-white">{puzzle.puzzle.rating}</b>
                  </span>
                  <a href={puzzle.puzzle.gameUrl} target="_blank" rel="noreferrer" className="link">
                    lichess ↗
                  </a>
                </div>
              </div>

              {puzzle.solution.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-ink-600 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
                    {t('trainer.solution')}:
                  </span>
                  {puzzle.solution.map((m, i) => (
                    <span
                      key={m.uci}
                      className="flex items-center gap-1 rounded bg-ink-600 px-1.5 py-0.5 font-mono text-[12px] text-ink-100"
                    >
                      <MoveBadge kind={i % 2 === 0 ? 'best' : 'forced'} size={13} />
                      {m.san}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          {/* rating card */}
          <div className="card p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-ink-300">
                  {t('trainer.yourRating')}
                </div>
                <div className="mono text-3xl font-black text-white">{user?.rating ?? '—'}</div>
              </div>
              {lastDelta !== null && (
                <div
                  className={`mono animate-floatUp rounded-md px-2 py-1 text-sm font-bold ${
                    lastDelta >= 0 ? 'bg-grass-400/15 text-grass-300' : 'bg-red-500/15 text-red-300'
                  }`}
                >
                  {lastDelta >= 0 ? '+' : ''}
                  {lastDelta}
                </div>
              )}
            </div>
            <div className="mt-2">
              <RatingChart data={history} height={84} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-md bg-ink-750 py-1.5">
                <div className="mono text-sm font-bold text-white">{stats?.stats.todayCount ?? 0}</div>
                <div className="text-[10px] text-ink-300">{t('trainer.todaySolved')}</div>
              </div>
              <div className="rounded-md bg-ink-750 py-1.5">
                <div className="mono text-sm font-bold text-white">🔥 {stats?.streak ?? 0}</div>
                <div className="text-[10px] text-ink-300">{t('trainer.streak')}</div>
              </div>
              <div className="rounded-md bg-ink-750 py-1.5">
                <div className="mono text-sm font-bold text-white">
                  {stats ? Math.round(stats.stats.accuracy * 100) : 0}%
                </div>
                <div className="text-[10px] text-ink-300">{t('trainer.accuracy')}</div>
              </div>
            </div>
          </div>

          {/* difficulty */}
          <div className="card p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-300">
              {t('trainer.difficulty')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition ${
                    difficulty === d.id
                      ? 'bg-grass-400 text-ink-900'
                      : 'bg-ink-750 text-ink-200 hover:bg-ink-600 hover:text-white'
                  }`}
                >
                  {t(d.key)}
                </button>
              ))}
            </div>
            <Link to="/themes" className="mt-3 block text-xs font-semibold text-grass-300 hover:underline">
              {t('themes.title')} →
            </Link>
          </div>

          {/* rush promo */}
          <Link
            to="/rush"
            className="card block overflow-hidden p-4 transition hover:border-grass-400/60"
            style={{ background: 'linear-gradient(135deg, rgba(129,182,76,.16), rgba(49,46,43,1) 55%)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{t('rush.title')}</div>
                <div className="mt-0.5 text-[11px] text-ink-300">{t('rush.subtitle').slice(0, 62)}…</div>
              </div>
              <span className="text-2xl">⚡</span>
            </div>
            {stats?.rushBest && (
              <div className="mt-2 text-[11px] text-ink-300">
                {t('rush.best')}: <b className="mono text-grass-300">{stats.rushBest.score}</b>
              </div>
            )}
          </Link>
        </aside>
      </div>
    </div>
  );
}
