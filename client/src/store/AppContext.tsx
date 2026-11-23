import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken, type StatsResponse, type User } from '../lib/api';

export interface Toast {
  id: number;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface AppValue {
  user: User | null;
  stats: StatsResponse | null;
  ready: boolean;
  authError: string | null;
  pending: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshStats: () => Promise<void>;
  setUser: (u: User) => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
}

const AppContext = createContext<AppValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(1);
  const bootstrapped = useRef(false);

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const refreshStats = useCallback(async () => {
    try {
      const s = await api.stats();
      setStats(s);
      setUserState((prev) => (prev ? { ...prev, rating: s.user.rating } : s.user));
    } catch {
      /* offline / not signed in */
    }
  }, []);

  const startGuest = useCallback(async () => {
    const { token, user: guest } = await api.guest();
    setToken(token);
    setUserState(guest);
  }, []);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      try {
        if (getToken()) {
          try {
            const { user: me } = await api.me();
            setUserState(me);
          } catch {
            setToken(null);
            await startGuest();
          }
        } else {
          await startGuest();
        }
        await refreshStats();
      } catch (err) {
        console.error(err);
      } finally {
        setReady(true);
      }
    })();
  }, [refreshStats, startGuest]);

  const login = useCallback(
    async (username: string, password: string) => {
      setPending(true);
      setAuthError(null);
      try {
        const { token, user: me } = await api.login(username, password);
        setToken(token);
        setUserState(me);
        await refreshStats();
        toast(`Welcome back, ${me.username}!`, 'success');
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Login failed');
        throw err;
      } finally {
        setPending(false);
      }
    },
    [refreshStats, toast],
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setPending(true);
      setAuthError(null);
      try {
        const { token, user: me } = await api.register(username, email, password);
        setToken(token);
        setUserState(me);
        await refreshStats();
        toast(`Account created — good luck, ${me.username}!`, 'success');
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Registration failed');
        throw err;
      } finally {
        setPending(false);
      }
    },
    [refreshStats, toast],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUserState(null);
    setStats(null);
    void (async () => {
      try {
        await startGuest();
        await refreshStats();
      } catch {
        /* ignore */
      }
    })();
  }, [refreshStats, startGuest]);

  const value = useMemo<AppValue>(
    () => ({
      user,
      stats,
      ready,
      authError,
      pending,
      login,
      register,
      logout,
      refreshStats,
      setUser: setUserState,
      toasts,
      toast,
    }),
    [user, stats, ready, authError, pending, login, register, logout, refreshStats, toasts, toast],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
