import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Avatar, Spinner } from '../components/ui';

type Entry = { rank: number; username: string; handle: string; value: number; detail: string; isGuest?: boolean };

export default function LeaderboardPage() {
  const { t } = useI18n();
  const [type, setType] = useState<'rating' | 'rush'>('rating');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .leaderboard(type)
      .then((r) => alive && setEntries(r.entries))
      .catch(() => alive && setEntries([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [type]);

  return (
    <div className="mx-auto max-w-4xl px-3 py-5 sm:px-5">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">{t('leaderboard.title')}</h1>
        <p className="text-sm text-ink-300">{t('leaderboard.subtitle')}</p>
      </div>

      <div className="mb-3 inline-flex rounded-lg bg-ink-750 p-1">
        {(['rating', 'rush'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setType(tab)}
            className={`rounded-md px-4 py-1.5 text-[13px] font-bold transition ${
              type === tab ? 'bg-ink-600 text-white' : 'text-ink-300 hover:text-white'
            }`}
          >
            {tab === 'rating' ? t('leaderboard.rating') : t('leaderboard.rush')}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-ink-300">
            <Spinner /> {t('common.loading')}
          </div>
        ) : entries.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-400">{t('leaderboard.empty')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-750 text-[11px] uppercase tracking-widest text-ink-300">
              <tr>
                <th className="w-12 px-3 py-2 text-center">{t('leaderboard.rank')}</th>
                <th className="px-3 py-2 text-start">{t('leaderboard.player')}</th>
                <th className="px-3 py-2 text-end">{type === 'rating' ? t('leaderboard.value') : t('leaderboard.score')}</th>
                <th className="hidden px-3 py-2 text-end sm:table-cell">{t('profile.solved')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-600">
              {entries.map((e) => (
                <tr key={`${e.handle}-${e.rank}`} className="transition hover:bg-ink-750/60">
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`mono inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                        e.rank === 1
                          ? 'bg-amber-400 text-ink-900'
                          : e.rank === 2
                            ? 'bg-ink-300 text-ink-900'
                            : e.rank === 3
                              ? 'bg-amber-700 text-white'
                              : 'text-ink-300'
                      }`}
                    >
                      {e.rank}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar name={e.username} size={26} />
                      <span className="truncate font-semibold text-white">{e.username}</span>
                      {e.isGuest && <span className="rounded bg-ink-600 px-1 text-[10px] text-ink-300">{t('nav.guest')}</span>}
                    </div>
                  </td>
                  <td className="mono px-3 py-2 text-end font-bold text-grass-300">{e.value}</td>
                  <td className="hidden px-3 py-2 text-end text-xs text-ink-300 sm:table-cell">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
