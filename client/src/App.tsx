import { useState } from 'react';
import { Route, Routes, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import PuzzlePage from './pages/PuzzlePage';
import RushPage from './pages/RushPage';
import DailyPage from './pages/DailyPage';
import ThemesPage from './pages/ThemesPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import LearnPage from './pages/LearnPage';
import { useApp } from './store/AppContext';
import { useI18n } from './lib/i18n';
import { Knight } from './components/ui';

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto w-full animate-slideUp rounded-lg border px-4 py-2 text-center text-sm font-semibold shadow-pop ${
            t.tone === 'success'
              ? 'border-grass-400/40 bg-grass-600 text-white'
              : t.tone === 'error'
                ? 'border-red-400/40 bg-red-700 text-white'
                : 'border-ink-500 bg-ink-700 text-ink-100'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-10 border-t border-ink-700 py-6 text-center text-xs text-ink-400">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4">
        <div className="flex items-center gap-2 text-ink-300">
          <Knight size={18} />
          <span className="font-bold">{t('brand.name')}</span>
        </div>
        <p>React · Node.js · SQLite — puzzles from the Lichess database (CC0)</p>
        <p className="flex gap-3">
          <Link to="/learn" className="hover:text-ink-200">
            {t('nav.learn')}
          </Link>
          <Link to="/themes" className="hover:text-ink-200">
            {t('nav.themes')}
          </Link>
          <Link to="/leaderboard" className="hover:text-ink-200">
            {t('nav.leaderboard')}
          </Link>
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const [authOpen, setAuthOpen] = useState(false);
  const { ready } = useApp();

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-ink-300">
        <Knight size={44} />
        <span className="text-sm">Loading Puzzle Arena…</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onAuth={() => setAuthOpen(true)} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/puzzles" element={<PuzzlePage />} />
          <Route path="/rush" element={<RushPage />} />
          <Route path="/daily" element={<DailyPage />} />
          <Route path="/themes" element={<ThemesPage />} />
          <Route path="/profile" element={<ProfilePage onAuth={() => setAuthOpen(true)} />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <Toasts />
    </div>
  );
}
