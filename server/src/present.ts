import { Chess } from 'chess.js';
import type { Puzzle } from './puzzles.js';
import type { PuzzleSession } from './sessions.js';
import type { UserRow } from './db.js';

const NAMES = [
  'TacticsTiger', 'EndgameEagle', 'KnightRider', 'PawnStormer', 'RookRoller', 'BishopBeam',
  'QueenQuake', 'CastlingCat', 'ZugzwangZoe', 'ForkMaster', 'PinPunisher', 'MateHunter',
  'SilentSac', 'BlunderBuster', 'GambitGuru', 'CheckmateCharlie', 'SkewerSam', 'TempoTina',
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function opponentFor(puzzle: Puzzle) {
  const h = hash(puzzle.id);
  return {
    name: NAMES[h % NAMES.length],
    rating: puzzle.rating,
    avatar: null as string | null,
    title: h % 7 === 0 ? 'IM' : h % 5 === 0 ? 'FM' : null,
  };
}

export interface ClientSession {
  sessionId: string;
  fen: string;
  orientation: 'white' | 'black';
  turn: 'w' | 'b';
  mode: PuzzleSession['mode'];
  theme: string | null;
  themes: string[];
  puzzleId: string;
  puzzleRating: number;
  yourRating: number;
  hintsUsed: number;
  opponent: ReturnType<typeof opponentFor>;
  startedAt: number;
}

export function presentSession(session: PuzzleSession, user: UserRow): ClientSession {
  const turn = new Chess(session.startFen).turn();
  return {
    sessionId: session.id,
    fen: session.startFen,
    orientation: turn === 'w' ? 'white' : 'black',
    turn,
    mode: session.mode,
    theme: session.theme ?? null,
    themes: session.puzzle.themes,
    puzzleId: session.puzzle.id,
    puzzleRating: session.puzzle.rating,
    yourRating: user.rating,
    hintsUsed: session.hintsUsed,
    opponent: opponentFor(session.puzzle),
    startedAt: session.startedAt,
  };
}
