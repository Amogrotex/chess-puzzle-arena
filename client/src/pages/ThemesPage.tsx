import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useI18n } from '../lib/i18n';
import { Spinner } from '../components/ui';

const GROUPS: Record<string, string[]> = {
  mates: [
    'mateIn1', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5', 'backRankMate', 'smotheredMate', 'arabianMate',
    'anastasiaMate', 'bodenMate', 'doubleBishopMate', 'dovetailMate', 'hookMate', 'cornerMate', 'operaMate',
    'pillsburysMate', 'epauletteMate', 'killBoxMate', 'morphysMate', 'swallowstailMate', 'triangleMate',
  ],
  tactics: [
    'fork', 'pin', 'skewer', 'discoveredAttack', 'discoveredCheck', 'doubleCheck', 'deflection', 'attraction',
    'clearance', 'interference', 'xRayAttack', 'zugzwang', 'sacrifice', 'hangingPiece', 'trappedPiece',
    'capturingDefender', 'intermezzo', 'quietMove', 'defensiveMove', 'promotion', 'advancedPawn', 'enPassant',
    'castling', 'attackingF2F7', 'exposedKing', 'kingsideAttack', 'queensideAttack', 'collinearMove',
  ],
  phases: [
    'opening', 'middlegame', 'endgame', 'rookEndgame', 'queenEndgame', 'pawnEndgame', 'bishopEndgame',
    'knightEndgame', 'queenRookEndgame', 'oneMove', 'short', 'long', 'veryLong', 'crushing', 'advantage',
    'equality', 'master', 'masterVsMaster', 'superGM',
  ],
};

interface GroupMeta {
  id: string;
  titleKey: 'themes.groupMates' | 'themes.groupTactics' | 'themes.groupEndgame';
  icon: string;
  accent: string;
}

const GROUP_META: GroupMeta[] = [
  { id: 'mates', titleKey: 'themes.groupMates', icon: '👑', accent: '#e0b341' },
  { id: 'tactics', titleKey: 'themes.groupTactics', icon: '⚔️', accent: '#81b64c' },
  { id: 'phases', titleKey: 'themes.groupEndgame', icon: '♟️', accent: '#5b9bd5' },
];

export function prettyTheme(theme: string) {
  return theme
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export default function ThemesPage() {
  const { t } = useI18n();
  const [themes, setThemes] = useState<{ theme: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api
      .meta()
      .then((m) => setThemes(m.themes))
      .catch(() => setThemes([]))
      .finally(() => setLoading(false));
  }, []);

  const byTheme = useMemo(() => new Map(themes.map((t) => [t.theme, t.count])), [themes]);

  const grouped = useMemo(() => {
    const used = new Set<string>();
    const out: (GroupMeta & { list: { theme: string; count: number }[] })[] = GROUP_META.map((g) => {
      const list = (GROUPS[g.id] ?? [])
        .filter((th) => byTheme.has(th))
        .map((th) => ({ theme: th, count: byTheme.get(th)! }))
        .sort((a, b) => b.count - a.count);
      list.forEach((l) => used.add(l.theme));
      return { ...g, list };
    });
    const rest = themes.filter((tt) => !used.has(tt.theme));
    if (rest.length) {
      out.push({ id: 'more', titleKey: 'themes.groupTactics', icon: '🎯', accent: '#a259b8', list: rest });
    }
    return out;
  }, [themes, byTheme]);

  const matches = (name: string) => prettyTheme(name).toLowerCase().includes(query.toLowerCase().trim());

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('themes.title')}</h1>
          <p className="text-sm text-ink-300">{t('themes.subtitle')}</p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('themes.search')}
          className="w-56 rounded-lg border border-ink-600 bg-ink-750 px-3 py-2 text-sm text-white outline-none focus:border-grass-400"
        />
      </div>

      <Link
        to="/puzzles"
        className="card mb-5 flex items-center justify-between gap-4 p-4 transition hover:border-grass-400/60"
        style={{ background: 'linear-gradient(120deg, rgba(129,182,76,.18), rgba(49,46,43,1) 60%)' }}
      >
        <div>
          <div className="text-base font-bold text-white">{t('themes.all')}</div>
          <div className="text-xs text-ink-300">{t('themes.allText')}</div>
        </div>
        <span className="btn-primary !py-1.5 text-[13px]">→</span>
      </Link>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-300">
          <Spinner /> {t('common.loading')}
        </div>
      ) : (
        <div className="space-y-7">
          {grouped.map((group) => {
            const list = group.list.filter((l) => matches(l.theme));
            if (!list.length) return null;
            return (
              <section key={group.id}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-ink-300">
                  <span>{group.icon}</span> {t(group.titleKey)}
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map((item) => (
                    <Link
                      key={item.theme}
                      to={`/puzzles?theme=${encodeURIComponent(item.theme)}`}
                      className="group relative overflow-hidden rounded-lg border border-ink-600 bg-ink-700 px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-transparent hover:shadow-pop"
                    >
                      <span
                        className="absolute inset-y-0 start-0 w-1 opacity-70 transition group-hover:opacity-100"
                        style={{ background: group.accent }}
                      />
                      <div className="ps-1.5">
                        <div className="truncate text-[13px] font-semibold text-white">{prettyTheme(item.theme)}</div>
                        <div className="mono text-[11px] text-ink-300">
                          {item.count} {t('themes.puzzles')}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
