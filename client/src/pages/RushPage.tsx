import { useCallback, useEffect, useRef, useState } from 'react';
import { usePuzzle } from '../hooks/usePuzzle';
import PuzzleBoard from '../components/PuzzleBoard';
import { useApp } from '../store/AppContext';
import { useI18n } from '../lib/i18n';
import { api, type RushRun } from '../lib/api';
import { sound } from '../lib/sound';
import { Spinner } from '../components/ui';

const DURATIONS = [
  { ms: 60_000, label: '1' },
  { ms: 180_000, label: '3' },
  { ms: 300_000, label: '5' },
];

type Stage = 'idle' | 'playing' | 'over';

export default function RushPage() {
  const { t } = useI18n();
  const { refreshStats, stats, toast } = useApp();
  const [stage, setStage] = useState<Stage>('idle');
  const [durationMs, setDurationMs] = useState(180_000);
  const [run, setRun] = useState<RushRun | null>(null);
  const [remaining, setRemaining] = useState(durationMs);
  const [finalRun, setFinalRun] = useState<RushRun | null>(null);
  const [starting, setStarting] = useState(false);
  const runRef = useRef<RushRun | null>(null);
  const finishing = useRef(false);

  const onSolved = useCallback(
    async (res: { puzzle?: { id: string } }) => {
      void res;
      const current = runRef.current;
      if (!current) return;
      try {
        const { run: updated } = await api.rushResult(current.runId, true);
        runRef.current = updated;
        setRun(updated);
        if (updated.over) {
          finish(updated);
        } else {
          window.setTimeout(() => void puzzle.load(), 260);
        }
      } catch (err) {
        console.error(err);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onFailed = useCallback(async () => {
    const current = runRef.current;
    if (!current) return;
    try {
      const { run: updated } = await api.rushResult(current.runId, false);
      runRef.current = updated;
      setRun(updated);
      if (updated.over) {
        window.setTimeout(() => finish(updated), 1100);
      } else {
        window.setTimeout(() => void puzzle.load(), 1500);
      }
    } catch (err) {
      console.error(err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const puzzle = usePuzzle({
    mode: 'rush',
    autoLoad: false,
    onSolved,
    onFailed,
  });

  const finish = (r: RushRun) => {
    if (finishing.current) return;
    finishing.current = true;
    setFinalRun(r);
    setStage('over');
    sound.end();
    void api.rushResult(r.runId, undefined, true).catch(() => undefined);
    void refreshStats();
  };

  /* ------------------------------------------------------------- timer */
  useEffect(() => {
    if (stage !== 'playing' || !run) return;
    const tick = () => {
      const left = Math.max(0, run.startedAt + run.durationMs - Date.now());
      setRemaining(left);
      if (left <= 0 && !finishing.current) {
        finishing.current = true;
        finish({ ...run, over: true });
      }
    };
    tick();
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, run?.runId]);

  useEffect(() => {
    if (stage === 'playing' && remaining <= 10_000 && remaining > 0 && Math.floor(remaining / 1000) !== Math.floor((remaining + 120) / 1000)) {
      sound.tick();
    }
  }, [remaining, stage]);

  const start = async () => {
    setStarting(true);
    try {
      const { run: fresh } = await api.rushStart(durationMs);
      runRef.current = fresh;
      setRun(fresh);
      setFinalRun(null);
      finishing.current = false;
      setRemaining(durationMs);
      setStage('playing');
      sound.start();
      await puzzle.load();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not start rush', 'error');
    } finally {
      setStarting(false);
    }
  };

  const quit = () => {
    if (run) finish({ ...run, over: true });
    else setStage('idle');
  };

  const best = stats?.rushBest?.score ?? 0;
  const lives = run?.lives ?? 3;

  const controls =
    stage === 'playing' ? (
      <div className="flex items-center justify-center gap-2">
        <button onClick={quit} className="btn-secondary !px-3 !py-1.5 text-[12px]">
          {t('rush.finalScore')}
        </button>
      </div>
    ) : (
      <div className="flex items-center justify-center gap-2 text-[12px] text-ink-300">
        <span>⚡ {t('rush.subtitle')}</span>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">
          ⚡ {t('rush.title')}
        </h1>
        <span className="chip">
          {t('rush.best')}: <b className="mono text-grass-300">{best}</b>
        </span>
      </div>

      {stage === 'idle' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-lg font-bold text-white">{t('rush.rules')}</h2>
            <ol className="mt-3 space-y-2 text-sm text-ink-200">
              <li className="flex gap-2">
                <span className="text-grass-400">1.</span> {t('rush.rule1')}
              </li>
              <li className="flex gap-2">
                <span className="text-grass-400">2.</span> {t('rush.rule2')}
              </li>
              <li className="flex gap-2">
                <span className="text-grass-400">3.</span> {t('rush.rule3')}
              </li>
            </ol>

            <div className="mt-5">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-300">
                {t('rush.duration')}
              </div>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.ms}
                    onClick={() => setDurationMs(d.ms)}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                      durationMs === d.ms ? 'bg-grass-400 text-ink-900' : 'bg-ink-600 text-ink-200 hover:bg-ink-500'
                    }`}
                  >
                    {d.label} {t('rush.min')}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => void start()} disabled={starting} className="btn-primary mt-5 w-full !py-3 text-base">
              {starting ? <Spinner /> : '⚡'} {t('rush.start')}
            </button>
          </div>

          <div className="card flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="text-6xl">♞</div>
            <p className="max-w-xs text-sm text-ink-300">{t('rush.subtitle')}</p>
            {stats?.rushBest && (
              <div className="rounded-lg bg-ink-750 px-4 py-2">
                <div className="text-[11px] uppercase tracking-wide text-ink-300">{t('rush.best')}</div>
                <div className="mono text-2xl font-black text-grass-300">{stats.rushBest.score}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {stage === 'playing' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <div className="card mb-3 p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-ink-300">{t('rush.score')}</div>
                    <div className="mono text-2xl font-black text-white">{run?.score ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-ink-300">{t('rush.streak')}</div>
                    <div className="mono text-2xl font-black text-grass-300">{run?.streak ?? 0}</div>
                  </div>
                </div>
                <div className="text-end">
                  <div className="text-[10px] uppercase tracking-widest text-ink-300">{t('rush.lives')}</div>
                  <div className="text-xl leading-none">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span key={i} className={i < lives ? '' : 'opacity-20'}>
                        ❤️
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-800">
                <div
                  className={`h-full rounded-full transition-[width] duration-150 ${
                    remaining < 15_000 ? 'bg-red-400' : 'bg-grass-400'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (remaining / (run?.durationMs ?? durationMs)) * 100))}%` }}
                />
              </div>
              <div className="mt-1 text-center text-[11px] text-ink-300 mono">
                {Math.floor(remaining / 60000)}:{String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}
              </div>
            </div>

            <PuzzleBoard
              compact
              session={puzzle.session}
              fen={puzzle.fen}
              phase={puzzle.phase}
              lastMove={puzzle.lastMove}
              arrows={puzzle.arrows}
              hintSquare={puzzle.hintSquare}
              shake={puzzle.shake}
              ratingDelta={null}
              onMove={(m) => void puzzle.playMove(m)}
              controls={controls}
              statusOverride={
                puzzle.phase === 'failed' && puzzle.solution[0] ? (
                  <span className="text-sm text-red-300">
                    {t('rush.correctMove')} <b className="text-white">{puzzle.solution[0].san}</b>
                  </span>
                ) : undefined
              }
            />
          </div>

          <aside className="card h-fit p-4">
            <h3 className="text-sm font-bold text-white">{t('rush.rules')}</h3>
            <ul className="mt-2 space-y-1.5 text-[12px] text-ink-300">
              <li>• {t('rush.rule1')}</li>
              <li>• {t('rush.rule2')}</li>
              <li>• {t('rush.rule3')}</li>
            </ul>
            <div className="mt-4 rounded-lg bg-ink-750 p-3">
              <div className="text-[11px] uppercase tracking-wide text-ink-300">{t('rush.best')}</div>
              <div className="mono text-xl font-black text-grass-300">{best}</div>
            </div>
          </aside>
        </div>
      )}

      {stage === 'over' && finalRun && (
        <div className="mx-auto max-w-md">
          <div className="card animate-popIn p-6 text-center">
            <div className="text-5xl">{finalRun.lives <= 0 ? '💥' : '⏱'}</div>
            <h2 className="mt-2 text-xl font-bold text-white">
              {finalRun.lives <= 0 ? t('rush.outOfLives') : t('rush.timeUp')}
            </h2>
            <div className="mt-4 rounded-xl bg-ink-750 p-4">
              <div className="text-[11px] uppercase tracking-widest text-ink-300">{t('rush.finalScore')}</div>
              <div className="mono text-5xl font-black text-grass-300">{finalRun.score}</div>
              <div className="mt-1 text-xs text-ink-300">
                {t('rush.streak')}: <b className="mono text-white">{finalRun.bestStreak}</b>
              </div>
              {finalRun.score > best && finalRun.score > 0 && (
                <div className="mt-2 inline-block rounded-full bg-grass-400/20 px-3 py-1 text-xs font-bold text-grass-300">
                  🏆 {t('rush.newBest')}
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => void start()} className="btn-primary flex-1">
                {t('rush.playAgain')}
              </button>
              <button onClick={() => setStage('idle')} className="btn-secondary flex-1">
                {t('rush.duration')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
