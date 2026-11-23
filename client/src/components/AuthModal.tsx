import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { useI18n } from '../lib/i18n';
import { Knight, Spinner } from './ui';

export default function AuthModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { login, register, pending, authError } = useApp();
  const { t } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!open) {
      setPassword('');
      setUsername('');
      setEmail('');
    }
  }, [open]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') await login(username, password);
      else await register(username, email, password);
      onClose();
    } catch {
      /* error is surfaced by the context */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm animate-slideUp rounded-2xl border border-ink-600 bg-ink-700 p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <Knight size={30} />
          <div>
            <h2 className="text-lg font-bold leading-tight text-white">{t('auth.welcome')}</h2>
            <p className="text-xs text-ink-300">{t('auth.welcomeText')}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-ink-800 p-1">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md py-1.5 text-[13px] font-bold transition ${
                mode === m ? 'bg-ink-600 text-white' : 'text-ink-300 hover:text-white'
              }`}
            >
              {t(m === 'login' ? 'auth.login' : 'auth.register')}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-300">
              {t('auth.username')}
            </span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              autoComplete="username"
              className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-white outline-none transition focus:border-grass-400"
            />
          </label>
          {mode === 'register' && (
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-300">{t('auth.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-white outline-none transition focus:border-grass-400"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-ink-300">
              {t('auth.password')}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-white outline-none transition focus:border-grass-400"
            />
          </label>

          {authError && <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">{authError}</p>}

          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <Spinner /> : null}
            {t(mode === 'login' ? 'auth.login' : 'auth.register')}
          </button>
        </form>

        <p className="mt-3 text-center text-[11px] text-ink-400">{t('auth.benefits')}</p>
        <button onClick={onClose} className="mt-3 w-full text-center text-xs text-ink-300 hover:text-white">
          {t('auth.continueGuest')}
        </button>
      </div>
    </div>
  );
}
