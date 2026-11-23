import { Link } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import Board from '../components/Board';

const POSITIONS = [
  { fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', caption: 'Ra8#' },
  { fen: '2r3k1/5ppp/8/8/8/8/5PPP/2R3K1 w - - 0 1', caption: 'Rc8+' },
];

export default function LearnPage() {
  const { t } = useI18n();

  const sections = [
    { h: t('learn.h1'), p: t('learn.p1') },
    { h: t('learn.h2'), p: t('learn.p2') },
    { h: t('learn.h3'), p: t('learn.p3') },
    { h: t('learn.h4'), p: t('learn.p4') },
  ];

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 sm:px-5">
      <h1 className="text-3xl font-black text-white">{t('learn.title')}</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-200">{t('learn.intro')}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {POSITIONS.map((p) => (
          <div key={p.fen} className="card p-2">
            <Board fen={p.fen} interactive={false} />
            <div className="px-1 py-1.5 text-center text-xs text-ink-300">{p.caption}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-5">
        {sections.map((s, i) => (
          <section key={s.h} className="card p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-grass-400 text-xs font-black text-ink-900">
                {i + 1}
              </span>
              <h2 className="text-base font-bold text-white">{s.h}</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-200">{s.p}</p>
          </section>
        ))}
      </div>

      <div className="card mt-5 p-5">
        <h2 className="text-base font-bold text-white">{t('learn.data')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-200">{t('learn.dataText')}</p>
      </div>

      <Link to="/puzzles" className="btn-primary mt-6 w-full !py-3 text-base">
        ♟ {t('learn.cta')}
      </Link>
    </div>
  );
}
