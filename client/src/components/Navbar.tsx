import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { useI18n } from '../lib/i18n';
import { Avatar, Knight } from './ui';
import { sound } from '../lib/sound';
import { OFFLINE_MODE } from '../lib/api';

const links = [
  { to: '/puzzles', key: 'nav.puzzles' },
  { to: '/rush', key: 'nav.rush' },
  { to: '/daily', key: 'nav.daily' },
  { to: '/themes', key: 'nav.themes' },
  { to: '/learn', key: 'nav.learn' },
  { to: '/leaderboard', key: 'nav.leaderboard' },
] as const;

export default function Navbar({ onAuth }: { onAuth: () => void }) {
  const { user, logout, stats } = useApp();
  const { t, lang, toggleLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [muted, setMuted] = useState(sound.muted);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-black/40 bg-ink-800/95 backdrop-blur supports-[backdrop-filter]:bg-ink-800/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:px-5">
        <Link to="/" className="flex items-center gap-2 font-bold text-white">
          <Knight size={28} />
          <span className="hidden text-[15px] tracking-tight sm:block">{t('brand.name')}</span>
        </Link>

        <nav className="ms-2 hidden items-center gap-0.5 md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-[13px] font-semibold transition ${
                  isActive ? 'bg-ink-700 text-white' : 'text-ink-200 hover:bg-ink-750 hover:text-white'
                }`
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-1.5">
          {OFFLINE_MODE && (
            <span
              className="hidden rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300 sm:block"
              title="Static demo build — puzzles and rating are stored in your browser"
            >
              demo
            </span>
          )}
          {user && !user.isGuest && (
            <span className="hidden items-center gap-1.5 rounded-md bg-ink-700 px-2.5 py-1.5 text-[13px] font-bold text-white sm:flex">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#81b64c" strokeWidth="2.5">
                <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="mono">{user.rating}</span>
              {stats?.streak ? <span title="daily streak">🔥{stats.streak}</span> : null}
            </span>
          )}

          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              sound.setMuted(next);
              if (!next) sound.move();
            }}
            className="rounded-md p-2 text-ink-300 transition hover:bg-ink-700 hover:text-white"
            title={muted ? 'Unmute' : 'Mute'}
            aria-label="sound"
          >
            {muted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 9v6h4l5 5V4L8 9H4zM16 8l5 8M21 8l-5 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 9v6h4l5 5V4L8 9H4z" />
                <path d="M16 8a5 5 0 010 8M19 5a9 9 0 010 14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </button>

          <button
            onClick={toggleLang}
            className="rounded-md px-2 py-1.5 text-[12px] font-bold text-ink-200 transition hover:bg-ink-700 hover:text-white"
            title="فارسی / English"
          >
            {lang === 'en' ? 'فا' : 'EN'}
          </button>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex items-center gap-2 rounded-md p-1 ps-1.5 transition hover:bg-ink-700"
              >
                <Avatar name={user.username} size={28} />
                <span className="hidden max-w-[100px] truncate text-[13px] font-semibold text-white sm:block">
                  {user.username}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" className="text-ink-300">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </button>
              {menu && (
                <div className="absolute end-0 mt-1 w-52 animate-slideUp overflow-hidden rounded-lg border border-ink-600 bg-ink-700 py-1 shadow-pop">
                  <div className="border-b border-ink-600 px-3 py-2">
                    <div className="truncate text-sm font-bold text-white">{user.username}</div>
                    <div className="text-[11px] text-ink-300">
                      {user.isGuest ? t('nav.guest') : t('nav.profile')} · <span className="mono">{user.rating}</span>
                    </div>
                  </div>
                  <Link to="/profile" className="block px-3 py-2 text-sm text-ink-100 hover:bg-ink-600">
                    {t('nav.profile')}
                  </Link>
                  {user.isGuest ? (
                    <button onClick={onAuth} className="block w-full px-3 py-2 text-start text-sm text-grass-300 hover:bg-ink-600">
                      {t('nav.signup')} / {t('nav.login')}
                    </button>
                  ) : (
                    <button onClick={logout} className="block w-full px-3 py-2 text-start text-sm text-ink-200 hover:bg-ink-600">
                      {t('nav.logout')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <button onClick={onAuth} className="btn-primary !px-3 !py-1.5 text-[13px]">
              {t('nav.login')}
            </button>
          )}

          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-md p-2 text-ink-200 hover:bg-ink-700 md:hidden"
            aria-label="menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-ink-600 bg-ink-750 px-2 py-2 md:hidden">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-semibold ${
                  isActive ? 'bg-ink-600 text-white' : 'text-ink-200 hover:bg-ink-600'
                }`
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}
