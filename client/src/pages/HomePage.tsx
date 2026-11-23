import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Board from '../components/Board';
import { useI18n } from '../lib/i18n';
import { useApp } from '../store/AppContext';
import { api } from '../lib/api';
import { Stat } from '../components/ui';

const HERO_FEN = 'r1bq1rk1/ppp2ppp/2n2n2/3pp3/3PP3/2N2N2/PPP2PPP/R1BQ1RK1 w - - 0 1';

export default function HomePage() {
  const { t } = useI18n();
  const { user, stats } = useApp();
  const [meta, setMeta] = useState<{ size: number; themes: number } | null>(null);

  useEffect(() => {
    api
      .meta()
      .then((m) => setMeta({ size: m.size, themes: m.themes.length }))
      .catch(() => setMeta(null));
  }, []);

  const features = [
    { icon: '🎯', title: t('home.feature1.title'), text: t('home.feature1.text') },
    { icon: '📈', title: t('home.feature2.title'), text: t('home.feature2.text') },
    { icon: '⚡', title: t('home.feature3.title'), text: t('home.feature3.text') },
  ];

  return (
    <div className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-10">
      <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-grass-400/30 bg-grass-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-grass-300">
            <span className="h-1.5 w-1.5 rounded-full bg-grass-400" /> {t('brand.tagline')}
          </div>
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">{t('home.title')}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-200 sm:text-base">{t('home.subtitle')}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/puzzles" className="btn-primary !px-6 !py-3 text-base">
              ♟ {t('home.start')}
            </Link>
            <Link to="/rush" className="btn-secondary !px-5 !py-3 text-base">
              ⚡ {t('home.rush')}
            </Link>
            <Link to="/daily" className="btn-ghost !px-5 !py-3 text-base">
              📅 {t('home.daily')}
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {user && !user.isGuest && (
              <Stat label={t('profile.rating')} value={user.rating} hint={`🔥 ${stats?.streak ?? 0}`} />
            )}
            <Stat label={t('home.statPuzzles')} value={meta ? meta.size.toLocaleString() : '…'} />
            <Stat label={t('home.statThemes')} value={meta ? meta.themes : '…'} />
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-full bg-grass-400/10 blur-3xl" />
          <div className="card p-2">
            <Board fen={HERO_FEN} interactive={false} orientation="white" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {features.slice(0, 2).map((f) => (
              <div key={f.title} className="card p-3">
                <div className="text-lg">{f.icon}</div>
                <div className="text-[13px] font-bold text-white">{f.title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-ink-300">{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="card p-5 transition hover:border-grass-400/40">
            <div className="text-2xl">{f.icon}</div>
            <h3 className="mt-2 text-base font-bold text-white">{f.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-300">{f.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-600 bg-gradient-to-r from-ink-700 to-ink-750 p-5">
        <div>
          <h3 className="text-lg font-bold text-white">{t('home.how')}</h3>
          <p className="text-sm text-ink-300">{t('learn.intro').slice(0, 110)}…</p>
        </div>
        <Link to="/learn" className="btn-secondary">
          {t('home.how')} →
        </Link>
      </div>
    </div>
  );
}
