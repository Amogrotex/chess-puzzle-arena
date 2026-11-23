import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

export const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  username     TEXT NOT NULL,
  handle       TEXT NOT NULL UNIQUE,          -- lowercase username, unique
  email        TEXT UNIQUE,
  password_hash TEXT,
  is_guest     INTEGER NOT NULL DEFAULT 0,
  rating       INTEGER NOT NULL DEFAULT 1200,
  country      TEXT,
  avatar       TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS solves (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id     TEXT NOT NULL,
  puzzle_rating INTEGER NOT NULL,
  success       INTEGER NOT NULL,
  mode          TEXT NOT NULL DEFAULT 'train',   -- train | daily | rush | theme
  theme         TEXT,
  time_ms       INTEGER NOT NULL DEFAULT 0,
  rating_before INTEGER NOT NULL,
  rating_after  INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_solves_user ON solves(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solves_puzzle ON solves(user_id, puzzle_id);

CREATE TABLE IF NOT EXISTS rush_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score       INTEGER NOT NULL,
  best_streak INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 180000,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rush_best ON rush_runs(user_id, score DESC);

CREATE TABLE IF NOT EXISTS daily_results (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,                    -- YYYY-MM-DD (UTC)
  puzzle_id  TEXT NOT NULL,
  success    INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date)
);
`);

export interface UserRow {
  id: string;
  username: string;
  handle: string;
  email: string | null;
  password_hash: string | null;
  is_guest: number;
  rating: number;
  country: string | null;
  avatar: string | null;
  created_at: number;
}

export const users = {
  byId: db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?'),
  byHandle: db.prepare<[string], UserRow>('SELECT * FROM users WHERE handle = ?'),
  byEmail: db.prepare<[string], UserRow>('SELECT * FROM users WHERE email = ?'),
  insert: db.prepare(
    `INSERT INTO users (id, username, handle, email, password_hash, is_guest, rating, country, avatar, created_at)
     VALUES (@id, @username, @handle, @email, @password_hash, @is_guest, @rating, @country, @avatar, @created_at)`,
  ),
  updateRating: db.prepare<[number, string]>('UPDATE users SET rating = ? WHERE id = ?'),
};

export const solves = {
  insert: db.prepare(
    `INSERT INTO solves (user_id, puzzle_id, puzzle_rating, success, mode, theme, time_ms, rating_before, rating_after, created_at)
     VALUES (@user_id, @puzzle_id, @puzzle_rating, @success, @mode, @theme, @time_ms, @rating_before, @rating_after, @created_at)`,
  ),
  recent: db.prepare<[string, number], {
    id: number; user_id: string; puzzle_id: string; puzzle_rating: number; success: number;
    mode: string; theme: string | null; time_ms: number; rating_before: number; rating_after: number; created_at: number;
  }>('SELECT * FROM solves WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
  recentIds: db.prepare<[string, number], { puzzle_id: string }>(
    'SELECT puzzle_id FROM solves WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
  ),
  history: db.prepare<[string, number], { created_at: number; rating_after: number; success: number }>(
    'SELECT created_at, rating_after, success FROM solves WHERE user_id = ? ORDER BY created_at ASC LIMIT ?',
  ),
  stats: db.prepare<[string], { total: number; solved: number; avgTime: number | null }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(success), 0) AS solved,
            AVG(CASE WHEN success = 1 THEN time_ms END) AS avgTime
     FROM solves WHERE user_id = ?`,
  ),
  themeStats: db.prepare<[string], { theme: string; total: number; solved: number }>(
    `SELECT theme, COUNT(*) AS total, SUM(success) AS solved
     FROM solves WHERE user_id = ? AND theme IS NOT NULL
     GROUP BY theme ORDER BY total DESC`,
  ),
  todayCount: db.prepare<[string, number, number], { c: number }>(
    'SELECT COUNT(*) AS c FROM solves WHERE user_id = ? AND created_at >= ? AND created_at < ?',
  ),
};

export const rush = {
  insert: db.prepare(
    `INSERT INTO rush_runs (user_id, score, best_streak, duration_ms, created_at)
     VALUES (@user_id, @score, @best_streak, @duration_ms, @created_at)`,
  ),
  best: db.prepare<[string], { score: number; best_streak: number; created_at: number }>(
    'SELECT score, best_streak, created_at FROM rush_runs WHERE user_id = ? ORDER BY score DESC LIMIT 1',
  ),
  top: db.prepare<[], { username: string; handle: string; score: number; best_streak: number; created_at: number }>(
    `SELECT u.username, u.handle, r.score, r.best_streak, r.created_at
     FROM rush_runs r JOIN users u ON u.id = r.user_id
     ORDER BY r.score DESC LIMIT 25`,
  ),
};

export const daily = {
  upsert: db.prepare(
    `INSERT INTO daily_results (user_id, date, puzzle_id, success, created_at)
     VALUES (@user_id, @date, @puzzle_id, @success, @created_at)
     ON CONFLICT(user_id, date) DO NOTHING`,
  ),
  byDate: db.prepare<[string, string], { success: number; puzzle_id: string }>(
    'SELECT success, puzzle_id FROM daily_results WHERE user_id = ? AND date = ?',
  ),
  recentDates: db.prepare<[string], { date: string; success: number }>(
    'SELECT date, success FROM daily_results WHERE user_id = ? ORDER BY date DESC LIMIT 400',
  ),
};

export const leaderboard = db.prepare<[number], { username: string; handle: string; rating: number; solves: number; is_guest: number }>(
  `SELECT u.username, u.handle, u.rating, u.is_guest,
          (SELECT COUNT(*) FROM solves s WHERE s.user_id = u.id AND s.success = 1) AS solves
   FROM users u
   ORDER BY u.rating DESC LIMIT ?`,
);
