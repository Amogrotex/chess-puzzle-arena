import { Router } from 'express';
import { leaderboard, daily as dailyTable, rush as rushTable, solves } from '../db.js';
import { publicUser, requireUser } from '../auth.js';
import { currentStreak } from './puzzles.js';

export const statsRouter = Router();

statsRouter.get('/me/stats', requireUser, (req, res) => {
  const user = req.user!;
  const stats = solves.stats.get(user.id) ?? { total: 0, solved: 0, avgTime: null };
  const history = solves.history.all(user.id, 500);
  const themeStats = solves.themeStats.all(user.id).slice(0, 12);
  const rushBest = rushTable.best.get(user.id) ?? null;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  res.json({
    user: publicUser(user),
    stats: {
      total: stats.total,
      solved: stats.solved,
      accuracy: stats.total ? stats.solved / stats.total : 0,
      avgTimeMs: stats.avgTime ? Math.round(stats.avgTime) : null,
      todayCount: solves.todayCount.get(user.id, today.getTime(), tomorrow.getTime())?.c ?? 0,
    },
    ratingHistory: history.map((h) => ({ t: h.created_at, rating: h.rating_after, success: !!h.success })),
    themeStats: themeStats.map((t) => ({
      theme: t.theme,
      total: t.total,
      solved: t.solved,
      accuracy: t.total ? t.solved / t.total : 0,
    })),
    rushBest: rushBest ? { score: rushBest.score, bestStreak: rushBest.best_streak, at: rushBest.created_at } : null,
    streak: currentStreak(user.id),
    dailyHistory: dailyTable.recentDates.all(user.id).slice(0, 28).map((r) => ({
      date: r.date,
      success: !!r.success,
    })),
    recent: solves.recent.all(user.id, 15).map((s) => ({
      puzzleId: s.puzzle_id,
      success: !!s.success,
      mode: s.mode,
      theme: s.theme,
      puzzleRating: s.puzzle_rating,
      delta: s.rating_after - s.rating_before,
      timeMs: s.time_ms,
      at: s.created_at,
    })),
  });
});

statsRouter.get('/me/daily-status', requireUser, (req, res) => {
  const row = dailyTable.byDate.get(req.user!.id, new Date().toISOString().slice(0, 10));
  res.json({
    played: !!row,
    success: row ? !!row.success : null,
    streak: currentStreak(req.user!.id),
  });
});

export const leaderboardRouter = Router();

leaderboardRouter.get('/', (req, res) => {
  const type = req.query.type === 'rush' ? 'rush' : 'rating';
  if (type === 'rush') {
    res.json({
      type,
      entries: rushTable.top.all().map((r, i) => ({
        rank: i + 1,
        username: r.username,
        handle: r.handle,
        value: r.score,
        detail: `${r.best_streak} best streak`,
      })),
    });
    return;
  }
  res.json({
    type,
    entries: leaderboard.all(25).map((u, i) => ({
      rank: i + 1,
      username: u.username,
      handle: u.handle,
      value: u.rating,
      detail: `${u.solves} solved`,
      isGuest: !!u.is_guest,
    })),
  });
});
