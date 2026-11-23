import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { daily as dailyTable, rush as rushTable, solves, users, type UserRow } from '../db.js';
import { requireUser } from '../auth.js';
import { dataset, dailyPuzzle, pickPuzzle, themeExists, todayKey } from '../puzzles.js';
import {
  createSession,
  fullSolution,
  getHint,
  getSession,
  markRevealed,
  playMove,
  resetSession,
  type PuzzleSession,
} from '../sessions.js';
import { newRating } from '../rating.js';
import { presentSession } from '../present.js';

export const puzzlesRouter = Router();

/* ---------------------------------------------------------------- meta ---- */

puzzlesRouter.get('/meta', (_req, res) => {
  res.json({
    size: dataset.size,
    themes: dataset.themes,
    ratingRange: dataset.ratingRange,
  });
});

/* ------------------------------------------------------------ next one ---- */

puzzlesRouter.get('/next', requireUser, (req, res) => {
  const user = req.user!;
  const theme = typeof req.query.theme === 'string' && req.query.theme !== 'all' ? req.query.theme : undefined;
  if (theme && !themeExists(theme)) {
    res.status(400).json({ error: 'unknown-theme', message: `Unknown theme: ${theme}` });
    return;
  }
  const difficulty = typeof req.query.difficulty === 'string' ? req.query.difficulty : 'adaptive';
  const mode = req.query.mode === 'rush' ? 'rush' : theme ? 'theme' : 'train';

  const seen = new Set(solves.recentIds.all(user.id, 300).map((r) => r.puzzle_id));
  const puzzle = pickPuzzle({
    theme,
    difficulty,
    rating: user.rating,
    seen,
    avoid: typeof req.query.avoid === 'string' ? req.query.avoid : undefined,
  });

  const session = createSession(puzzle, user, mode, theme);
  res.json({ session: presentSession(session, user) });
});

/* --------------------------------------------------------------- moves ---- */

puzzlesRouter.post('/:id/move', requireUser, (req, res) => {
  const user = req.user!;
  const session = getSession(String(req.params.id));
  if (!session || session.userId !== user.id) {
    res.status(404).json({ error: 'session-not-found' });
    return;
  }
  const { from, to, promotion } = req.body ?? {};
  if (typeof from !== 'string' || typeof to !== 'string') {
    res.status(400).json({ error: 'bad-move' });
    return;
  }

  const result = playMove(session, { from, to, promotion });

  let rating: { before: number; after: number; delta: number } | null = null;
  if (result.finished && ['solved', 'failed'].includes(session.status)) {
    rating = settle(session, user, session.status === 'solved');
  }

  res.json({
    ...result,
    rating,
    rush: session.rushRunId ? rushSnapshot(session.rushRunId) : undefined,
    puzzle: result.finished ? puzzleInfo(session) : undefined,
    solution: session.status === 'failed' ? fullSolution(session) : undefined,
  });
});

/* --------------------------------------------------------------- hints ---- */

puzzlesRouter.post('/:id/hint', requireUser, (req, res) => {
  const user = req.user!;
  const session = getSession(String(req.params.id));
  if (!session || session.userId !== user.id) {
    res.status(404).json({ error: 'session-not-found' });
    return;
  }
  const level = Number(req.body?.level ?? session.hintsUsed + 1);
  res.json(getHint(session, Number.isFinite(level) ? level : undefined));
});

/* ------------------------------------------------------------ solution ---- */

puzzlesRouter.post('/:id/solution', requireUser, (req, res) => {
  const user = req.user!;
  const session = getSession(String(req.params.id));
  if (!session || session.userId !== user.id) {
    res.status(404).json({ error: 'session-not-found' });
    return;
  }
  const wasSolved = session.status === 'solved';
  markRevealed(session);
  const rating = wasSolved ? null : settle(session, user, false);
  res.json({
    solution: fullSolution(session),
    fen: session.startFen,
    status: session.status,
    rating,
    puzzle: puzzleInfo(session),
  });
});

/* --------------------------------------------------------- retry / skip ---- */

puzzlesRouter.post('/:id/retry', requireUser, (req, res) => {
  const user = req.user!;
  const session = getSession(String(req.params.id));
  if (!session || session.userId !== user.id) {
    res.status(404).json({ error: 'session-not-found' });
    return;
  }
  resetSession(session);
  res.json({ session: presentSession(session, user) });
});

puzzlesRouter.post('/:id/skip', requireUser, (req, res) => {
  const user = req.user!;
  const session = getSession(String(req.params.id));
  if (!session || session.userId !== user.id) {
    res.status(404).json({ error: 'session-not-found' });
    return;
  }
  session.status = 'skipped';
  session.finishedAt = Date.now();
  res.json({ ok: true, solution: fullSolution(session), puzzle: puzzleInfo(session) });
});

/* ---------------------------------------------------------------- daily ---- */

puzzlesRouter.get('/daily', requireUser, (req, res) => {
  const user = req.user!;
  const key = todayKey();
  const puzzle = dailyPuzzle();
  const already = dailyTable.byDate.get(user.id, key);

  const session = createSession(puzzle, user, 'daily');
  res.json({
    session: presentSession(session, user),
    date: key,
    alreadyPlayedToday: !!already,
    streak: currentStreak(user.id),
  });
});

/* ---------------------------------------------------- finish bookkeeping ---- */

function settle(session: PuzzleSession, user: UserRow, success: boolean) {
  if (session.ratingApplied) return null;
  session.ratingApplied = true;

  const rated = session.mode === 'train' || session.mode === 'theme';
  const stats = solves.stats.get(user.id);
  const before = user.rating;
  const after = rated ? newRating(before, session.puzzle.rating, success ? 1 : 0, stats?.total ?? 0) : before;

  if (rated && after !== before) {
    users.updateRating.run(after, user.id);
    user.rating = after;
  }

  solves.insert.run({
    user_id: user.id,
    puzzle_id: session.puzzle.id,
    puzzle_rating: session.puzzle.rating,
    success: success ? 1 : 0,
    mode: session.mode,
    theme: session.theme ?? session.puzzle.themes[0] ?? null,
    time_ms: Math.max(0, (session.finishedAt ?? Date.now()) - session.startedAt),
    rating_before: before,
    rating_after: after,
    created_at: Date.now(),
  });

  if (session.mode === 'daily') {
    dailyTable.upsert.run({
      user_id: user.id,
      date: todayKey(),
      puzzle_id: session.puzzle.id,
      success: success ? 1 : 0,
      created_at: Date.now(),
    });
  }

  return { before, after, delta: after - before };
}

function puzzleInfo(session: PuzzleSession) {
  return {
    id: session.puzzle.id,
    rating: session.puzzle.rating,
    themes: session.puzzle.themes,
    gameUrl: session.puzzle.gameUrl,
    opening: session.puzzle.opening,
    popularity: session.puzzle.popularity,
    plays: session.puzzle.plays,
  };
}

export function currentStreak(userId: string): number {
  const rows = dailyTable.recentDates.all(userId);
  const days = new Set(rows.filter((r) => r.success).map((r) => r.date));
  let streak = 0;
  const cursor = new Date();
  // allow "today is not played yet" without breaking a live streak
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/* ----------------------------------------------------------------- rush ---- */

interface RushRun {
  id: string;
  userId: string;
  score: number;
  streak: number;
  bestStreak: number;
  lives: number;
  durationMs: number;
  startedAt: number;
  saved: boolean;
}

const runs = new Map<string, RushRun>();
setInterval(() => {
  const now = Date.now();
  for (const [id, r] of runs) if (now - r.startedAt > r.durationMs + 60_000) runs.delete(id);
}, 60_000).unref?.();

function rushSnapshot(runId: string) {
  const run = runs.get(runId);
  if (!run) return null;
  return {
    runId: run.id,
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

export const rushRouter = Router();

rushRouter.post('/start', requireUser, (req, res) => {
  const durationMs = Math.min(600_000, Math.max(60_000, Number(req.body?.durationMs) || 180_000));
  const run: RushRun = {
    id: randomUUID(),
    userId: req.user!.id,
    score: 0,
    streak: 0,
    bestStreak: 0,
    lives: durationMs >= 300_000 ? 4 : 3,
    durationMs,
    startedAt: Date.now(),
    saved: false,
  };
  runs.set(run.id, run);
  res.json({ run: rushSnapshot(run.id) });
});

rushRouter.get('/:runId', requireUser, (req, res) => {
  const run = runs.get(String(req.params.runId));
  if (!run || run.userId !== req.user!.id) {
    res.status(404).json({ error: 'run-not-found' });
    return;
  }
  res.json({ run: rushSnapshot(run.id) });
});

/** Called by the client when a rush puzzle ends (solved / failed / skipped). */
rushRouter.post('/:runId/result', requireUser, (req, res) => {
  const run = runs.get(String(req.params.runId));
  if (!run || run.userId !== req.user!.id) {
    res.status(404).json({ error: 'run-not-found' });
    return;
  }
  const success = typeof req.body?.success === 'boolean' ? req.body.success : undefined;
  if (success === true) {
    run.score += 1;
    run.streak += 1;
    run.bestStreak = Math.max(run.bestStreak, run.streak);
  } else if (success === false) {
    run.streak = 0;
    run.lives -= 1;
  }

  const over = run.lives <= 0 || Date.now() - run.startedAt >= run.durationMs || !!req.body?.finish;
  if (over && !run.saved) {
    run.saved = true;
    rushTable.insert.run({
      user_id: run.userId,
      score: run.score,
      best_streak: run.bestStreak,
      duration_ms: run.durationMs,
      created_at: Date.now(),
    });
  }
  res.json({ run: rushSnapshot(run.id) });
});

export { runs as rushRuns };
