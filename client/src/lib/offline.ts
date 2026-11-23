/**
 * Offline / static build engine.
 *
 * The GitHub Pages deployment is static-only, so when `VITE_API_BASE=offline`
 * the client talks to this module instead of the Node API. It keeps the same
 * surface as `api` in `api.ts`, runs the puzzle rules with chess.js and stores
 * progress in localStorage — good enough for a fully playable demo.
 */
import { Chess } from 'chess.js';
import demo from '../data/puzzles.demo.json';
import type {
  ApiClient,
  MoveResponse,
  PuzzleInfo,
  RushRun,
  Session,
  StatsResponse,
  User,
} from './api';

interface DemoPuzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  popularity: number;
}

const PUZZLES = demo as DemoPuzzle[];

const STORE_KEY = 'puzzle-arena.offline.v1';

interface SolveRow {
  puzzleId: string;
  theme: string | null;
  mode: string;
  success: boolean;
  puzzleRating: number;
  delta: number;
  at: number;
  ratingAfter: number;
}

interface Store {
  user: User;
  solves: SolveRow[];
  rushBest: { score: number; bestStreak: number; at: number } | null;
  daily: Record<string, boolean>;
}

const OPPONENTS = [
  'TacticsTiger', 'EndgameEagle', 'KnightRider', 'PawnStormer', 'RookRoller', 'BishopBeam',
  'QueenQuake', 'ForkMaster', 'PinPunisher', 'MateHunter', 'SilentSac', 'GambitGuru',
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function freshUser(): User {
  const n = 100 + Math.floor(Math.random() * 900);
  return {
    id: 'local-user',
    username: `GuestPawn${n}`,
    handle: `guestpawn${n}`,
    rating: 1200,
    isGuest: true,
    country: null,
    avatar: null,
    createdAt: Date.now(),
  };
}

function load(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (parsed?.user && Array.isArray(parsed.solves)) return parsed;
    }
  } catch {
    /* corrupted storage */
  }
  const store: Store = { user: freshUser(), solves: [], rushBest: null, daily: {} };
  save(store);
  return store;
}

function save(store: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage full / blocked */
  }
}

let store: Store = load();

/* ------------------------------------------------------------------ elo --- */

function expected(player: number, puzzle: number) {
  return 1 / (1 + 10 ** ((puzzle - player) / 400));
}

function kFactor(rating: number, games: number) {
  if (games < 30) return 40;
  if (rating >= 2400) return 16;
  if (rating >= 2000) return 24;
  return 32;
}

function nextRating(before: number, puzzleRating: number, score: 0 | 1): { after: number; delta: number } {
  const k = kFactor(before, store.solves.length);
  let delta = Math.round(k * (score - expected(before, puzzleRating)));
  if (delta === 0) delta = score === 1 ? 1 : -1;
  delta = Math.max(-40, Math.min(40, delta));
  return { after: Math.max(400, Math.min(3200, before + delta)), delta };
}

/* -------------------------------------------------------------- picking --- */

const BANDS: Record<string, [number, number]> = {
  beginner: [400, 1000],
  easy: [1000, 1400],
  intermediate: [1400, 1800],
  advanced: [1800, 2200],
  master: [2200, 3200],
};

function pick(theme?: string, difficulty = 'adaptive'): DemoPuzzle {
  const rating = store.user.rating;
  let pool = theme && theme !== 'all' ? PUZZLES.filter((p) => p.themes.includes(theme)) : PUZZLES;
  if (!pool.length) pool = PUZZLES;

  const band = difficulty === 'adaptive' ? [Math.max(400, rating - 250), Math.min(3200, rating + 220)] : BANDS[difficulty] ?? [0, 4000];
  let candidates = pool.filter((p) => p.rating >= band[0] && p.rating <= band[1]);
  if (!candidates.length) {
    candidates = pool.slice().sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating)).slice(0, 40);
  }

  const recent = new Set(store.solves.slice(-60).map((s) => s.puzzleId));
  let best = candidates[0];
  let bestScore = -Infinity;
  for (let i = 0; i < 40; i++) {
    const p = candidates[Math.floor(Math.random() * candidates.length)];
    const score =
      (recent.has(p.id) ? 0.2 : 1) *
      (0.6 + p.popularity / 150) *
      (1 - Math.min(1, Math.abs(p.rating - rating) / 900)) *
      (0.7 + Math.random() * 0.6);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

/* ------------------------------------------------------------- sessions --- */

interface LocalSession {
  id: string;
  puzzle: DemoPuzzle;
  startFen: string;
  solution: string[];
  step: number;
  status: 'active' | 'solved' | 'failed' | 'revealed' | 'skipped';
  hintsUsed: number;
  startedAt: number;
  mode: 'train' | 'theme' | 'daily' | 'rush';
  theme?: string;
  settled: boolean;
}

const sessions = new Map<string, LocalSession>();

function boardAt(session: LocalSession): Chess {
  const board = new Chess(session.puzzle.fen);
  for (let i = 0; i < session.step; i++) {
    const uci = session.solution[i];
    try {
      board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      break;
    }
  }
  return board;
}

function createSession(puzzle: DemoPuzzle, mode: LocalSession['mode'], theme?: string): LocalSession {
  const uci = puzzle.moves.split(' ').filter(Boolean);
  const board = new Chess(puzzle.fen);
  board.move({ from: uci[0].slice(0, 2), to: uci[0].slice(2, 4), promotion: uci[0][4] });
  const session: LocalSession = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    puzzle,
    startFen: board.fen(),
    solution: uci,
    step: 1,
    status: 'active',
    hintsUsed: 0,
    startedAt: Date.now(),
    mode,
    theme,
    settled: false,
  };
  sessions.set(session.id, session);
  return session;
}

function opponentFor(puzzle: DemoPuzzle) {
  const h = hash(puzzle.id);
  return {
    name: OPPONENTS[h % OPPONENTS.length],
    rating: puzzle.rating,
    title: h % 7 === 0 ? 'IM' : h % 5 === 0 ? 'FM' : null,
    avatar: null as string | null,
  };
}

function presentSession(session: LocalSession): Session {
  return {
    sessionId: session.id,
    fen: session.startFen,
    orientation: new Chess(session.startFen).turn() === 'w' ? 'white' : 'black',
    turn: new Chess(session.startFen).turn(),
    mode: session.mode,
    theme: session.theme ?? null,
    themes: session.puzzle.themes,
    puzzleId: session.puzzle.id,
    puzzleRating: session.puzzle.rating,
    yourRating: store.user.rating,
    hintsUsed: session.hintsUsed,
    opponent: opponentFor(session.puzzle),
    startedAt: session.startedAt,
  };
}

function puzzleInfo(session: LocalSession): PuzzleInfo {
  return {
    id: session.puzzle.id,
    rating: session.puzzle.rating,
    themes: session.puzzle.themes,
    gameUrl: `https://lichess.org/training/${session.puzzle.id}`,
    opening: '',
    popularity: session.puzzle.popularity,
    plays: 0,
  };
}

function fullSolution(session: LocalSession) {
  const board = new Chess(session.startFen);
  return session.solution.slice(1).flatMap((uci) => {
    try {
      const m = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      return [{ uci, san: m.san }];
    } catch {
      return [];
    }
  });
}

function settle(session: LocalSession, success: boolean) {
  if (session.settled) return null;
  session.settled = true;
  const rated = session.mode === 'train' || session.mode === 'theme';
  const before = store.user.rating;
  const { after, delta } = rated
    ? nextRating(before, session.puzzle.rating, success ? 1 : 0)
    : { after: before, delta: 0 };
  if (rated) store.user = { ...store.user, rating: after };
  store.solves.push({
    puzzleId: session.puzzle.id,
    theme: session.theme ?? session.puzzle.themes[0] ?? null,
    mode: session.mode,
    success,
    puzzleRating: session.puzzle.rating,
    delta,
    at: Date.now(),
    ratingAfter: after,
  });
  if (store.solves.length > 800) store.solves = store.solves.slice(-800);
  save(store);
  return { before, after, delta };
}

function playMove(session: LocalSession, from: string, to: string, promotion?: string): MoveResponse {
  if (session.status !== 'active') {
    return { correct: false, status: session.status, finished: true, fen: session.startFen, message: 'session-over' };
  }
  const board = boardAt(session);
  let move;
  try {
    move = board.move({ from, to, promotion: promotion ?? 'q' });
  } catch {
    return { correct: false, illegal: true, status: session.status, finished: false, fen: session.startFen, message: 'illegal' };
  }

  const played = move.from + move.to + (move.promotion ?? '');
  const expectedUci = session.solution[session.step];
  const mate = board.isCheckmate();
  if (played !== expectedUci && !mate) {
    session.status = 'failed';
    return {
      correct: false,
      status: session.status,
      finished: true,
      fen: boardAt(session).fen(),
      san: move.san,
      solution: fullSolution(session),
      puzzle: puzzleInfo(session),
      rating: settle(session, false),
      bestMove: { from: expectedUci.slice(0, 2), to: expectedUci.slice(2, 4), san: expectedUci },
    };
  }

  session.step += 1;
  const afterUserFen = board.fen();

  if (mate || session.step >= session.solution.length) {
    session.status = 'solved';
    return {
      correct: true,
      status: session.status,
      finished: true,
      fen: afterUserFen,
      san: move.san,
      puzzle: puzzleInfo(session),
      rating: settle(session, true),
    };
  }

  const replyUci = session.solution[session.step];
  try {
    const reply = board.move({ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), promotion: replyUci[4] });
    session.step += 1;
    const finished = session.step >= session.solution.length;
    if (finished) session.status = 'solved';
    return {
      correct: true,
      status: session.status,
      finished,
      fen: afterUserFen,
      san: move.san,
      reply: { from: reply.from, to: reply.to, san: reply.san, fen: board.fen(), check: board.isCheck() },
      rating: finished ? settle(session, true) : null,
      puzzle: finished ? puzzleInfo(session) : undefined,
    };
  } catch {
    session.step = session.solution.length;
    session.status = 'solved';
    return {
      correct: true,
      status: session.status,
      finished: true,
      fen: afterUserFen,
      san: move.san,
      rating: settle(session, true),
      puzzle: puzzleInfo(session),
    };
  }
}

/* ----------------------------------------------------------------- rush --- */

interface LocalRun {
  runId: string;
  score: number;
  streak: number;
  bestStreak: number;
  lives: number;
  durationMs: number;
  startedAt: number;
  saved: boolean;
}

const runs = new Map<string, LocalRun>();

function snapshot(run: LocalRun): RushRun {
  return {
    runId: run.runId,
    score: run.score,
    streak: run.streak,
    bestStreak: run.bestStreak,
    lives: run.lives,
    durationMs: run.durationMs,
    startedAt: run.startedAt,
    elapsedMs: Date.now() - run.startedAt,
    over: run.lives <= 0 || Date.now() - run.startedAt >= run.durationMs,
  };
}

/* ---------------------------------------------------------------- stats --- */

function computeStats(): StatsResponse {
  const rows = store.solves;
  const solved = rows.filter((r) => r.success).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const themeMap = new Map<string, { total: number; solved: number }>();
  for (const r of rows) {
    if (!r.theme) continue;
    const cur = themeMap.get(r.theme) ?? { total: 0, solved: 0 };
    cur.total += 1;
    if (r.success) cur.solved += 1;
    themeMap.set(r.theme, cur);
  }
  return {
    user: store.user,
    stats: {
      total: rows.length,
      solved,
      accuracy: rows.length ? solved / rows.length : 0,
      avgTimeMs: null,
      todayCount: rows.filter((r) => r.at >= today.getTime()).length,
    },
    ratingHistory: rows.map((r) => ({ t: r.at, rating: r.ratingAfter, success: r.success })),
    themeStats: [...themeMap.entries()]
      .map(([theme, v]) => ({ theme, total: v.total, solved: v.solved, accuracy: v.solved / v.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12),
    rushBest: store.rushBest,
    streak: dailyStreak(),
    dailyHistory: Object.entries(store.daily).map(([date, success]) => ({ date, success })),
    recent: rows
      .slice(-15)
      .reverse()
      .map((r) => ({
        puzzleId: r.puzzleId,
        success: r.success,
        mode: r.mode,
        theme: r.theme,
        puzzleRating: r.puzzleRating,
        delta: r.delta,
        timeMs: 0,
        at: r.at,
      })),
  };
}

function dailyStreak(): number {
  const today = new Date();
  const key = (d: Date) => d.toISOString().slice(0, 10);
  let streak = 0;
  const cursor = new Date(today);
  if (!store.daily[key(cursor)]) cursor.setUTCDate(cursor.getUTCDate() - 1);
  for (;;) {
    if (!store.daily[key(cursor)]) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

const BOTS = [
  { username: 'MagnusWannabe', value: 2842 },
  { username: 'TacticsTiger', value: 2411 },
  { username: 'KnightRider', value: 2188 },
  { username: 'PawnStormer', value: 1976 },
  { username: 'GambitGuru', value: 1754 },
  { username: 'EndgameEagle', value: 1520 },
  { username: 'QuietMove', value: 1333 },
];

/* ------------------------------------------------------------------ api --- */

export const offlineApi: ApiClient = {
  async guest() {
    return { token: 'offline', user: store.user };
  },
  async login(username: string) {
    store.user = { ...store.user, username, handle: username.toLowerCase(), isGuest: false };
    save(store);
    return { token: 'offline', user: store.user };
  },
  async register(username: string) {
    store.user = { ...store.user, username, handle: username.toLowerCase(), isGuest: false };
    save(store);
    return { token: 'offline', user: store.user };
  },
  async me() {
    return { user: store.user };
  },

  async meta() {
    const counts = new Map<string, number>();
    for (const p of PUZZLES) for (const t of p.themes) counts.set(t, (counts.get(t) ?? 0) + 1);
    return {
      size: PUZZLES.length,
      themes: [...counts.entries()].map(([theme, count]) => ({ theme, count })).sort((a, b) => b.count - a.count),
      ratingRange: [PUZZLES[0]?.rating ?? 0, PUZZLES[PUZZLES.length - 1]?.rating ?? 0] as [number, number],
    };
  },
  async next({ theme, difficulty } = {}) {
    const puzzle = pick(theme && theme !== 'all' ? theme : undefined, difficulty);
    const session = createSession(puzzle, theme && theme !== 'all' ? 'theme' : 'train', theme);
    return { session: presentSession(session) };
  },
  async move(sessionId, from, to, promotion) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('session not found');
    return playMove(session, from, to, promotion);
  },
  async hint(sessionId, level) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('session not found');
    const lvl = Math.min(3, Math.max(1, level));
    session.hintsUsed = Math.max(session.hintsUsed, lvl);
    const uci = session.solution[session.step];
    if (!uci) return { level: lvl, pieceType: null, pieceColor: null };
    const piece = boardAt(session).get(uci.slice(0, 2) as never) as { type: string; color: string } | undefined;
    const out: { level: number; pieceType: string | null; pieceColor: string | null; from?: string; to?: string } = {
      level: lvl,
      pieceType: piece?.type ?? null,
      pieceColor: piece?.color ?? null,
    };
    if (lvl >= 2) out.from = uci.slice(0, 2);
    if (lvl >= 3) out.to = uci.slice(2, 4);
    return out;
  },
  async solution(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('session not found');
    if (session.status === 'active') session.status = 'failed';
    return {
      solution: fullSolution(session),
      fen: session.startFen,
      status: session.status,
      rating: settle(session, false),
      puzzle: puzzleInfo(session),
    };
  },
  async retry(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('session not found');
    session.step = 1;
    session.status = 'active';
    session.hintsUsed = 0;
    session.startedAt = Date.now();
    return { session: presentSession(session) };
  },
  async skip(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('session not found');
    session.status = 'skipped';
    return { ok: true, solution: fullSolution(session) };
  },

  async daily() {
    const key = new Date().toISOString().slice(0, 10);
    const pool = PUZZLES.filter((p) => p.rating >= 1150 && p.rating <= 1850);
    const puzzle = pool[hash(`daily-${key}`) % pool.length];
    const session = createSession(puzzle, 'daily');
    // a daily puzzle session is shared for the day
    const existing = [...sessions.values()].find((s) => s.mode === 'daily' && s.puzzle.id === puzzle.id);
    return {
      session: presentSession(existing ?? session),
      date: key,
      alreadyPlayedToday: !!store.daily[key],
      streak: dailyStreak(),
    };
  },

  async rushStart(durationMs) {
    const run: LocalRun = {
      runId: `run-${Date.now()}`,
      score: 0,
      streak: 0,
      bestStreak: 0,
      lives: durationMs >= 300_000 ? 4 : 3,
      durationMs,
      startedAt: Date.now(),
      saved: false,
    };
    runs.set(run.runId, run);
    return { run: snapshot(run) };
  },
  async rushResult(runId, success, finish) {
    const run = runs.get(runId);
    if (!run) throw new Error('run not found');
    if (success === true) {
      run.score += 1;
      run.streak += 1;
      run.bestStreak = Math.max(run.bestStreak, run.streak);
    } else if (success === false) {
      run.streak = 0;
      run.lives -= 1;
    }
    const over = finish || run.lives <= 0 || Date.now() - run.startedAt >= run.durationMs;
    if (over && !run.saved) {
      run.saved = true;
      if (!store.rushBest || run.score > store.rushBest.score) {
        store.rushBest = { score: run.score, bestStreak: run.bestStreak, at: Date.now() };
        save(store);
      }
    }
    return { run: snapshot(run) };
  },

  async stats() {
    return computeStats();
  },
  async dailyStatus() {
    const key = new Date().toISOString().slice(0, 10);
    return { played: !!store.daily[key], success: store.daily[key] ?? null, streak: dailyStreak() };
  },
  async leaderboard(type: 'rating' | 'rush' = 'rating') {
    const entries = BOTS.map((b, i) => ({
      rank: i + 1,
      username: b.username,
      handle: b.username.toLowerCase(),
      value: type === 'rush' ? Math.round(b.value / 40) : b.value,
      detail: type === 'rush' ? `${Math.round(b.value / 90)} best streak` : `${b.value * 3} solved`,
      isGuest: false,
    }));
    const me = {
      rank: entries.length + 1,
      username: store.user.username,
      handle: store.user.handle,
      value: type === 'rush' ? (store.rushBest?.score ?? 0) : store.user.rating,
      detail: `${store.solves.filter((s) => s.success).length} solved`,
      isGuest: true,
    };
    return { type, entries: [...entries, me].sort((a, b) => b.value - a.value).map((e, i) => ({ ...e, rank: i + 1 })) };
  },
};
