import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useI18n } from '../lib/i18n';
import { Avatar, RatingChart, SectionTitle, Spinner } from '../components/ui';
import { api, type StatsResponse } from '../lib/api';
import { prettyTheme } from './ThemesPage';

export default function ProfilePage({ onAuth }: { onAuth: () => void }) {
  const { user, refreshStats, toast } = useApp();
  const { t } = useI18n();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .stats()
      .then((s) => alive && setStats(s))
      .catch((e) => toast(e instanceof Error ? e.message : 'failed', 'error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [toast]);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  if (loading || !stats) {
    return (
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-10 text-sm text-ink-300">
        <Spinner /> {t('common.loading')}
      </div>
    );
  }

  const history = stats.ratingHistory.slice(-120).map((h) => ({ t: h.t, rating: h.rating }));
  const avgTime = stats.stats.avgTimeMs ? `${(stats.stats.avgTimeMs / 1000).toFixed(1)}s` : '—';

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
      {u_guest(user?.isGuest) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-grass-400/30 bg-grass-400/10 px-4 py-3">
          <p className="text-sm text-grass-200">{t('profile.guestNote')}</p>
          <button onClick={onAuth} className="btn-primary !py-1.5 text-[13px]">
            {t('nav.signup')}
          </button>
        </div>
      )}

      <div className="card mb-4 flex flex-wrap items-center gap-4 p-4">
        <Avatar name={stats.user.username} size={64} ring="green" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold text-white">{stats.user.username}</h1>
          <p className="text-xs text-ink-300">
            {t('profile.memberSince')}{' '}
            {new Date(stats.user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
            {stats.user.isGuest ? ` · ${t('nav.guest')}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-ink-750 px-4 py-2 text-center">
            <div className="text-[10px] uppercase tracking-widest text-ink-300">{t('profile.rating')}</div>
            <div className="mono text-2xl font-black text-grass-300">{stats.user.rating}</div>
          </div>
          <div className="rounded-lg bg-ink-750 px-4 py-2 text-center">
            <div className="text-[10px] uppercase tracking-widest text-ink-300">{t('daily.streak')}</div>
            <div className="mono text-2xl font-black text-white">🔥{stats.streak}</div>
          </div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t('profile.solved'), value: stats.stats.solved },
          { label: t('profile.attempts'), value: stats.stats.total },
          { label: t('profile.accuracy'), value: `${Math.round(stats.stats.accuracy * 100)}%` },
          { label: t('profile.avgTime'), value: avgTime },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className="text-[10px] uppercase tracking-widest text-ink-300">{s.label}</div>
            <div className="mono text-2xl font-black text-white">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="card p-4">
          <SectionTitle
            right={<span className="mono text-xs text-ink-300">{stats.user.rating}</span>}
          >
            {t('profile.ratingHistory')}
          </SectionTitle>
          {history.length >= 2 ? (
            <RatingChart data={history} height={180} />
          ) : (
            <p className="py-10 text-center text-sm text-ink-400">{t('profile.noHistory')}</p>
          )}

          <div className="mt-4">
            <SectionTitle>{t('profile.recent')}</SectionTitle>
            {stats.recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-400">{t('profile.noRecent')}</p>
            ) : (
              <ul className="divide-y divide-ink-600">
                {stats.recent.map((r, i) => (
                  <li key={`${r.puzzleId}-${i}`} className="flex items-center gap-3 py-2 text-sm">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${
                        r.success ? 'bg-grass-400/20 text-grass-300' : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {r.success ? '✓' : '✕'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink-100">
                      {r.theme ? prettyTheme(r.theme) : r.mode}
                    </span>
                    <span className="mono text-xs text-ink-300">{r.puzzleRating}</span>
                    {r.delta !== 0 && (
                      <span className={`mono w-10 text-end text-xs font-bold ${r.delta > 0 ? 'text-grass-300' : 'text-red-300'}`}>
                        {r.delta > 0 ? '+' : ''}
                        {r.delta}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <SectionTitle>{t('profile.rushBest')}</SectionTitle>
            {stats.rushBest ? (
              <div className="flex items-end gap-3">
                <div className="mono text-4xl font-black text-grass-300">{stats.rushBest.score}</div>
                <div className="pb-1 text-xs text-ink-300">
                  {t('rush.streak')}: <b className="mono text-white">{stats.rushBest.bestStreak}</b>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-400">{t('profile.notPlayed')}</p>
            )}
            <Link to="/rush" className="btn-secondary mt-3 w-full !py-1.5 text-[13px]">
              ⚡ {t('rush.title')}
            </Link>
          </div>

          <div className="card p-4">
            <SectionTitle>{t('profile.themeAccuracy')}</SectionTitle>
            {stats.themeStats.length === 0 ? (
              <p className="text-sm text-ink-400">{t('profile.notPlayed')}</p>
            ) : (
              <ul className="space-y-2">
                {stats.themeStats.map((th) => (
                  <li key={th.theme}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className="truncate text-ink-100">{prettyTheme(th.theme)}</span>
                      <span className="mono text-ink-300">
                        {Math.round(th.accuracy * 100)}% · {th.solved}/{th.total}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full bg-grass-400"
                        style={{ width: `${Math.round(th.accuracy * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function u_guest(isGuest?: boolean) {
  return !!isGuest;
}
