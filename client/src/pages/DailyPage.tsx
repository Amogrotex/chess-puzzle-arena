import { useEffect, useMemo, useState } from 'react';
import { usePuzzle } from '../hooks/usePuzzle';
import PuzzleBoard from '../components/PuzzleBoard';
import { MoveBadge } from '../components/MoveBadge';
import { useApp } from '../store/AppContext';
import { useI18n } from '../lib/i18n';

function prettyTheme(theme: string) {
  return theme.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

export default function DailyPage() {
  const { t, lang } = useI18n();
  const { stats, refreshStats, toast } = useApp();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState('');

  const puzzle = usePuzzle({
    mode: 'daily',
    onSolved: () => void refreshStats(),
    onFailed: () => void refreshStats(),
  });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const ms = next.getTime() - now.getTime();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, []);

  const days = useMemo(() => {
    const map = new Map((stats?.dailyHistory ?? []).map((d) => [d.date, d.success]));
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - (13 - i));
      const key = d.toISOString().slice(0, 10);
      return { key, success: map.get(key) ?? null, label: d.getUTCDate() };
    });
  }, [stats?.dailyHistory]);

  const share = async () => {
    const text = `♟ Puzzle Arena — ${puzzle.session ? new Date().toISOString().slice(0, 10) : ''}\n${
      puzzle.phase === 'solved' ? '✅ Solved' : '❌ Missed'
    }${puzzle.ratingDelta ? ` (${puzzle.ratingDelta > 0 ? '+' : ''}${puzzle.ratingDelta})` : ''}\n🔥 ${
      stats?.streak ?? 0
    } day streak`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast(t('daily.copied'), 'success');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast(text, 'info');
    }
  };

  const solved = puzzle.phase === 'solved';

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">{t('daily.title')}</h1>
          <p className="text-xs text-ink-300">{t('daily.subtitle')}</p>
        </div>
        <div className="chip !text-sm">
          🔥 <b className="mono">{stats?.streak ?? 0}</b> {t('daily.streak')}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PuzzleBoard
          session={puzzle.session}
          fen={puzzle.fen}
          phase={puzzle.phase}
          lastMove={puzzle.lastMove}
          arrows={puzzle.arrows}
          hintSquare={puzzle.hintSquare}
          badges={puzzle.badges}
          shake={puzzle.shake}
          ratingDelta={null}
          onMove={(m) => void puzzle.playMove(m)}
          controls={
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => void puzzle.takeHint()}
                disabled={puzzle.phase !== 'ready' || puzzle.hintsUsed >= 3}
                className="btn-ghost !px-3 !py-1.5 text-[13px]"
              >
                💡 {t('trainer.hint')}
              </button>
              <button
                onClick={() => void puzzle.revealSolution()}
                disabled={puzzle.phase !== 'ready' && puzzle.phase !== 'failed'}
                className="btn-ghost !px-3 !py-1.5 text-[13px]"
              >
                👁 {t('trainer.solution')}
              </button>
              {(solved || puzzle.phase === 'failed' || puzzle.phase === 'revealed') && (
                <button onClick={share} className="btn-primary !px-4 !py-1.5 text-[13px]">
                  {copied ? '✓' : '↗'} {t('daily.share')}
                </button>
              )}
            </div>
          }
        />

        <aside className="space-y-3">
          <div className="card p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink-300">
              {new Date().toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              {puzzle.alreadyPlayed || solved ? t('daily.done') : t('daily.missedToday')}
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-widest text-ink-300">{t('daily.comeBack')}</div>
            <div className="mono text-lg font-bold text-white">{countdown}</div>
          </div>

          <div className="card p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ink-300">
              {t('daily.history')}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d) => (
                <div
                  key={d.key}
                  title={d.key}
                  className={`flex aspect-[3/4] items-center justify-center rounded text-[11px] font-bold ${
                    d.success === true
                      ? 'bg-grass-400 text-ink-900'
                      : d.success === false
                        ? 'bg-red-500/70 text-white'
                        : 'bg-ink-750 text-ink-400'
                  }`}
                >
                  {d.label}
                </div>
              ))}
            </div>
          </div>

          {puzzle.puzzle && (
            <div className="card animate-slideUp p-4">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-300">
                {t('trainer.theme')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {puzzle.puzzle.themes.map((th) => (
                  <span key={th} className="chip">
                    {prettyTheme(th)}
                  </span>
                ))}
              </div>
              {puzzle.solution.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-ink-600 pt-2">
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
        </aside>
      </div>
    </div>
  );
}
