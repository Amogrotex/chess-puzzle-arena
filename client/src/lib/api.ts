import { offlineApi } from './offline';

export interface User {
  id: string;
  username: string;
  handle: string;
  rating: number;
  isGuest: boolean;
  country: string | null;
  avatar: string | null;
  createdAt: number;
}

export interface Session {
  sessionId: string;
  fen: string;
  orientation: 'white' | 'black';
  turn: 'w' | 'b';
  mode: 'train' | 'theme' | 'daily' | 'rush';
  theme: string | null;
  themes: string[];
  puzzleId: string;
  puzzleRating: number;
  yourRating: number;
  hintsUsed: number;
  opponent: { name: string; rating: number; title: string | null; avatar: string | null };
  startedAt: number;
}

export interface MoveResponse {
  correct: boolean;
  illegal?: boolean;
  status: 'active' | 'solved' | 'failed' | 'revealed' | 'skipped';
  finished: boolean;
  fen: string;
  san?: string;
  reply?: { from: string; to: string; san: string; fen: string; check: boolean } | null;
  bestMove?: { from: string; to: string; san: string };
  rating?: { before: number; after: number; delta: number } | null;
  puzzle?: PuzzleInfo;
  solution?: { uci: string; san: string }[];
  rush?: RushRun | null;
  message?: string;
}

export interface PuzzleInfo {
  id: string;
  rating: number;
  themes: string[];
  gameUrl: string;
  opening: string;
  popularity: number;
  plays: number;
}

export interface RushRun {
  runId: string;
  score: number;
  streak: number;
  bestStreak: number;
  lives: number;
  durationMs: number;
  startedAt: number;
  elapsedMs: number;
  over: boolean;
}

export interface StatsResponse {
  user: User;
  stats: {
    total: number;
    solved: number;
    accuracy: number;
    avgTimeMs: number | null;
    todayCount: number;
  };
  ratingHistory: { t: number; rating: number; success: boolean }[];
  themeStats: { theme: string; total: number; solved: number; accuracy: number }[];
  rushBest: { score: number; bestStreak: number; at: number } | null;
  streak: number;
  dailyHistory: { date: string; success: boolean }[];
  recent: {
    puzzleId: string;
    success: boolean;
    mode: string;
    theme: string | null;
    puzzleRating: number;
    delta: number;
    timeMs: number;
    at: number;
  }[];
}

const TOKEN_KEY = 'puzzle-arena.token';

/**
 * Where the API lives. Empty string = same origin (the Node server also serves
 * the built client). For a static deployment (e.g. GitHub Pages) point this at
 * your hosted API, otherwise the client falls back to offline demo mode.
 */
export const API_BASE = String(import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
export const OFFLINE_MODE = import.meta.env.VITE_API_BASE === 'offline';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage might be blocked */
  }
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let guestBootstrap: Promise<string> | null = null;

/** Create (once) a guest session and store its token — used when a request is unauthenticated. */
async function ensureGuestToken(): Promise<string> {
  if (!guestBootstrap) {
    guestBootstrap = fetch(`${API_BASE}/api/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then((r) => r.json())
      .then((data: { token: string }) => {
        setToken(data.token);
        return data.token;
      })
      .finally(() => {
        guestBootstrap = null;
      });
  }
  return guestBootstrap;
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = init.body;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }
  let res = await fetch(`${API_BASE}/api${path}`, { ...init, headers, body });

  // the app bootstraps a guest session asynchronously; retry once if we raced it
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const token2 = await ensureGuestToken();
    res = await fetch(`${API_BASE}/api${path}`, { ...init, headers: { ...headers, Authorization: `Bearer ${token2}` }, body });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(data?.message ?? data?.error ?? res.statusText, res.status, data?.error);
  }
  return data as T;
}

const post = <T>(path: string, json?: unknown) => request<T>(path, { method: 'POST', json });

const httpApi = {
  /* auth */
  guest: () => post<{ token: string; user: User }>('/auth/guest'),
  login: (username: string, password: string) =>
    post<{ token: string; user: User }>('/auth/login', { username, password }),
  register: (username: string, email: string, password: string) =>
    post<{ token: string; user: User }>('/auth/register', { username, email, password }),
  me: () => request<{ user: User }>('/auth/me'),

  /* puzzles */
  meta: () => request<{ size: number; themes: { theme: string; count: number }[]; ratingRange: [number, number] }>('/puzzles/meta'),
  next: (params: { theme?: string; difficulty?: string; mode?: 'rush'; avoid?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.theme && params.theme !== 'all') q.set('theme', params.theme);
    if (params.difficulty) q.set('difficulty', params.difficulty);
    if (params.mode) q.set('mode', params.mode);
    if (params.avoid) q.set('avoid', params.avoid);
    return request<{ session: Session }>(`/puzzles/next?${q.toString()}`);
  },
  move: (sessionId: string, from: string, to: string, promotion?: string) =>
    post<MoveResponse>(`/puzzles/${sessionId}/move`, { from, to, promotion }),
  hint: (sessionId: string, level: number) =>
    post<{ level: number; pieceType: string | null; pieceColor: string | null; from?: string; to?: string }>(
      `/puzzles/${sessionId}/hint`,
      { level },
    ),
  solution: (sessionId: string) =>
    post<{ solution: { uci: string; san: string }[]; fen: string; status: string; rating?: { before: number; after: number; delta: number } | null; puzzle: PuzzleInfo }>(
      `/puzzles/${sessionId}/solution`,
    ),
  retry: (sessionId: string) => post<{ session: Session }>(`/puzzles/${sessionId}/retry`),
  skip: (sessionId: string) => post<{ ok: boolean; solution: { uci: string; san: string }[] }>(`/puzzles/${sessionId}/skip`),

  daily: () =>
    request<{ session: Session; date: string; alreadyPlayedToday: boolean; streak: number }>('/puzzles/daily'),

  /* rush */
  rushStart: (durationMs: number) => post<{ run: RushRun }>('/rush/start', { durationMs }),
  rushResult: (runId: string, success?: boolean, finish?: boolean) =>
    post<{ run: RushRun }>(`/rush/${runId}/result`, { success, finish }),

  /* stats */
  stats: () => request<StatsResponse>('/me/stats'),
  dailyStatus: () => request<{ played: boolean; success: boolean | null; streak: number }>('/me/daily-status'),
  leaderboard: (type: 'rating' | 'rush' = 'rating') =>
    request<{ type: string; entries: { rank: number; username: string; handle: string; value: number; detail: string; isGuest?: boolean }[] }>(
      `/leaderboard?type=${type}`,
    ),
};

export type ApiClient = typeof httpApi;

/**
 * App-wide API client. On a static deployment (GitHub Pages) `VITE_API_BASE=offline`
 * makes every call run against the bundled dataset + localStorage instead.
 */
export const api: ApiClient = OFFLINE_MODE ? offlineApi : httpApi;
