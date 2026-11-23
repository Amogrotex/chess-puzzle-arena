import fs from 'node:fs';
import { config, DIFFICULTY_BANDS } from './config.js';

export interface Puzzle {
  id: string;
  fen: string;
  moves: string; // UCI, space separated; moves[0] is the opponent's setup move
  rating: number;
  themes: string[];
  popularity: number;
  plays: number;
  gameUrl: string;
  opening: string;
}

if (!fs.existsSync(config.puzzlesFile)) {
  throw new Error(
    `Puzzle dataset not found at ${config.puzzlesFile}.\n` +
      `Run "python3 scripts/build-puzzles.py <lichess_db_puzzle.csv>" to generate it (see README).`,
  );
}

const puzzles: Puzzle[] = JSON.parse(fs.readFileSync(config.puzzlesFile, 'utf8'));
const byId = new Map(puzzles.map((p) => [p.id, p]));

/** theme -> puzzles */
const byTheme = new Map<string, Puzzle[]>();
for (const p of puzzles) {
  for (const t of p.themes) {
    if (!byTheme.has(t)) byTheme.set(t, []);
    byTheme.get(t)!.push(p);
  }
}

export const dataset = {
  size: puzzles.length,
  themes: [...byTheme.entries()]
    .map(([theme, list]) => ({ theme, count: list.length }))
    .sort((a, b) => b.count - a.count),
  ratingRange: [puzzles[0]?.rating ?? 0, puzzles[puzzles.length - 1]?.rating ?? 0] as [number, number],
};

export function getPuzzle(id: string): Puzzle | undefined {
  return byId.get(id);
}

export function themeExists(theme: string): boolean {
  return byTheme.has(theme);
}

export interface PickOptions {
  theme?: string;
  difficulty?: string;
  /** player rating, used by the "adaptive" difficulty */
  rating?: number;
  /** puzzle ids the player already saw, they get a much lower weight */
  seen?: Set<string>;
  /** never return this puzzle (the previous one) */
  avoid?: string;
}

/** Weighted random pick: prefers popular puzzles and ones the player hasn't seen. */
export function pickPuzzle(opts: PickOptions = {}): Puzzle {
  const { theme, difficulty = 'adaptive', rating = 1200, seen, avoid } = opts;

  let pool = theme && byTheme.has(theme) ? byTheme.get(theme)! : puzzles;
  let band = DIFFICULTY_BANDS[difficulty] ?? DIFFICULTY_BANDS.adaptive;
  if (difficulty === 'adaptive') {
    band = [Math.max(400, rating - 250), Math.min(3200, rating + 220)];
  }

  let candidates = pool.filter((p) => p.rating >= band[0] && p.rating <= band[1] && p.id !== avoid);
  if (candidates.length === 0) {
    // fall back to the closest ratings in the requested theme
    candidates = pool.filter((p) => p.id !== avoid).slice().sort(
      (a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating),
    ).slice(0, 300);
  }
  if (candidates.length === 0) candidates = puzzles;

  // sample 40 random candidates, then score them
  const sample: Puzzle[] = [];
  for (let i = 0; i < 40 && sample.length < candidates.length; i++) {
    sample.push(candidates[(Math.random() * candidates.length) | 0]);
  }
  let best = sample[0];
  let bestScore = -Infinity;
  for (const p of sample) {
    const novelty = seen?.has(p.id) ? 0.15 : 1;
    const quality = 0.6 + p.popularity / 150;
    const closeness = 1 - Math.min(1, Math.abs(p.rating - rating) / 900);
    const score = novelty * quality * (0.55 + 0.45 * closeness) * (0.7 + Math.random() * 0.6);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Stable, deterministic daily puzzle (same for everybody, per UTC day). */
export function dailyPuzzle(date = new Date()): Puzzle {
  const key = date.toISOString().slice(0, 10);
  const pool = puzzles.filter((p) => p.rating >= 1150 && p.rating <= 1850 && p.popularity >= 95);
  return pool[hashString(`puzzle-arena-${key}`) % pool.length];
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
