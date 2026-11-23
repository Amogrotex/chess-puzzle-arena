import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
/** repo root (works whether we run from src/ via tsx or from dist/ in prod) */
export const repoRoot = path.resolve(here, '..', '..');

export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'puzzle-arena-dev-secret-change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  dbFile: process.env.DB_FILE ?? path.join(repoRoot, 'data', 'app.db'),
  puzzlesFile: process.env.PUZZLES_FILE ?? path.join(repoRoot, 'data', 'puzzles.json'),
  clientDist: process.env.CLIENT_DIST ?? path.join(repoRoot, 'client', 'dist'),
  isProd: process.env.NODE_ENV === 'production',
};

/** Ratings used for the "difficulty" presets in the UI. */
export const DIFFICULTY_BANDS: Record<string, [number, number]> = {
  beginner: [400, 1000],
  easy: [1000, 1400],
  intermediate: [1400, 1800],
  advanced: [1800, 2200],
  master: [2200, 3200],
  adaptive: [0, 4000], // resolved per-user (±220 around the player rating)
};
