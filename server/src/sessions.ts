import { randomUUID } from 'node:crypto';
import { Chess, type Move } from 'chess.js';
import type { Puzzle } from './puzzles.js';
import type { UserRow } from './db.js';

export type SessionStatus = 'active' | 'solved' | 'failed' | 'revealed' | 'skipped';
export type PuzzleMode = 'train' | 'theme' | 'daily' | 'rush';

export interface PuzzleSession {
  id: string;
  userId: string;
  puzzle: Puzzle;
  mode: PuzzleMode;
  theme?: string;
  /** position the player starts from (after the opponent's setup move) */
  startFen: string;
  /** full solution line in UCI, including the opponent's setup move at index 0 */
  solutionUci: string[];
  /** index in solutionUci of the next expected ply */
  step: number;
  status: SessionStatus;
  hintsUsed: number;
  startedAt: number;
  finishedAt?: number;
  ratingApplied: boolean;
  rushRunId?: string;
}

const sessions = new Map<string, PuzzleSession>();
const TTL_MS = 1000 * 60 * 60 * 3;

function prune() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - (s.finishedAt ?? s.startedAt) > TTL_MS) sessions.delete(id);
  }
}
setInterval(prune, 1000 * 60 * 10).unref?.();

export function getSession(id: string): PuzzleSession | undefined {
  return sessions.get(id);
}

export function createSession(
  puzzle: Puzzle,
  user: Pick<UserRow, 'id'> & { rating: number },
  mode: PuzzleMode = 'train',
  theme?: string,
  rushRunId?: string,
): PuzzleSession {
  const uci = puzzle.moves.split(' ').filter(Boolean);
  const setup = uci[0];
  const board = new Chess(puzzle.fen);
  board.move({ from: setup.slice(0, 2), to: setup.slice(2, 4), promotion: setup[4] });

  const session: PuzzleSession = {
    id: randomUUID(),
    userId: user.id,
    puzzle,
    mode,
    theme,
    startFen: board.fen(),
    solutionUci: uci,
    step: 1,
    status: 'active',
    hintsUsed: 0,
    startedAt: Date.now(),
    ratingApplied: false,
    rushRunId,
  };
  sessions.set(session.id, session);
  return session;
}

export interface MoveInput {
  from: string;
  to: string;
  promotion?: string;
}

export interface MoveResult {
  correct: boolean;
  illegal?: boolean;
  status: SessionStatus;
  finished: boolean;
  fen: string;
  san?: string;
  /** the opponent's automatic reply, when the puzzle continues */
  reply?: { from: string; to: string; san: string; fen: string; check: boolean };
  /** present when the move was wrong: the move the position wanted, so the UI can show it */
  bestMove?: { from: string; to: string; san: string };
  message?: string;
}

/** Chess instance at the puzzle's starting position (before the player's first move). */
export function startBoard(session: PuzzleSession): Chess {
  return new Chess(session.startFen);
}

export function playMove(session: PuzzleSession, input: MoveInput): MoveResult {
  if (session.status !== 'active') {
    return {
      correct: false,
      status: session.status,
      finished: true,
      fen: currentFen(session),
      message: 'session-not-active',
    };
  }

  const board = currentBoard(session);
  let move: Move;
  try {
    move = board.move({ from: input.from.toLowerCase(), to: input.to.toLowerCase(), promotion: input.promotion ?? 'q' });
  } catch {
    return {
      correct: false,
      illegal: true,
      status: session.status,
      finished: false,
      fen: board.fen(),
      message: 'illegal-move',
    };
  }

  const playedUci = move.from + move.to + (move.promotion ?? '');
  const expectedUci = session.solutionUci[session.step];
  const isMate = board.isCheckmate();
  const isCorrect = playedUci === expectedUci || isMate;

  if (!isCorrect) {
    const before = currentFen(session);
    const expected = playUci(expectedUci);
    session.status = 'failed';
    session.finishedAt = Date.now();
    return {
      correct: false,
      status: session.status,
      finished: true,
      fen: before,
      san: move.san,
      bestMove: expected,
      message: isMate ? undefined : 'wrong-move',
    };
  }

  session.step += 1;
  const afterUserFen = board.fen();

  // puzzle finished with the player's move (mate / last ply)?
  if (isMate || session.step >= session.solutionUci.length) {
    session.status = 'solved';
    session.finishedAt = Date.now();
    return {
      correct: true,
      status: session.status,
      finished: true,
      fen: afterUserFen,
      san: move.san,
    };
  }

  // opponent replies automatically
  const replyUci = session.solutionUci[session.step];
  let reply: Move;
  try {
    reply = board.move({ from: replyUci.slice(0, 2), to: replyUci.slice(2, 4), promotion: replyUci[4] });
  } catch {
    // defensive: malformed trailing ply in the dataset -> the puzzle is over
    session.step = session.solutionUci.length;
    session.status = 'solved';
    session.finishedAt = Date.now();
    return { correct: true, status: session.status, finished: true, fen: afterUserFen, san: move.san };
  }
  session.step += 1;

  const finished = session.step >= session.solutionUci.length;
  if (finished) {
    session.status = 'solved';
    session.finishedAt = Date.now();
  }

  return {
    correct: true,
    status: session.status,
    finished,
    fen: afterUserFen,
    san: move.san,
    reply: {
      from: reply.from,
      to: reply.to,
      san: reply.san,
      fen: board.fen(),
      check: board.isCheck(),
    },
  };
}

function playUci(uci: string): { from: string; to: string; san: string } {
  // the SAN is resolved by the caller when needed; keep it cheap here
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), san: uci };
}

/** The live position: replay every ply already accepted by the session. */
export function currentFen(session: PuzzleSession): string {
  const board = new Chess(session.puzzle.fen);
  for (let i = 0; i < session.step; i++) {
    const uci = session.solutionUci[i];
    try {
      board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      break;
    }
  }
  return board.fen();
}

/** Progressive hints: 1 = which piece, 2 = where it comes from, 3 = the move itself. */
export function getHint(session: PuzzleSession, requestedLevel?: number) {
  const level = Math.min(3, Math.max(1, requestedLevel ?? session.hintsUsed + 1));
  session.hintsUsed = Math.max(session.hintsUsed, level);

  const board = currentBoard(session);
  const uci = session.solutionUci[session.step];
  if (!uci) return { level, done: true as const };

  const piece = board.get(uci.slice(0, 2) as never) as { type: string; color: string } | undefined;
  const hint: Record<string, unknown> = {
    level,
    pieceType: piece?.type ?? null,
    pieceColor: piece?.color ?? null,
  };
  if (level >= 2) hint.from = uci.slice(0, 2);
  if (level >= 3) hint.to = uci.slice(2, 4);
  return hint;
}

/** The remaining solution, as moves from the current position (used by the hint button). */
export function solutionFromCurrent(session: PuzzleSession) {
  const board = currentBoard(session);
  const out: { uci: string; san: string; from: string; to: string; color: 'w' | 'b' }[] = [];
  for (let i = session.step; i < session.solutionUci.length; i++) {
    const uci = session.solutionUci[i];
    try {
      const m = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      out.push({ uci, san: m.san, from: m.from, to: m.to, color: m.color });
    } catch {
      break;
    }
  }
  return out;
}

/** Chess instance positioned at the live session position. */
export function currentBoard(session: PuzzleSession): Chess {
  const board = new Chess(session.puzzle.fen);
  for (let i = 0; i < session.step; i++) {
    const uci = session.solutionUci[i];
    try {
      board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      break;
    }
  }
  return board;
}

/** Full solution from the starting position (used by the "solution" panel). */
export function fullSolution(session: PuzzleSession) {
  const board = new Chess(session.startFen);
  const out: { uci: string; san: string }[] = [];
  for (const uci of session.solutionUci.slice(1)) {
    try {
      const m = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      out.push({ uci, san: m.san });
    } catch {
      /* ignore malformed trailing ply */
    }
  }
  return out;
}

export function markRevealed(session: PuzzleSession) {
  if (session.status === 'solved') return;
  session.status = 'revealed';
  session.finishedAt = Date.now();
}

export function resetSession(session: PuzzleSession) {
  session.step = 1;
  session.status = 'active';
  session.hintsUsed = 0;
  session.startedAt = Date.now();
  session.finishedAt = undefined;
  session.ratingApplied = false;
}
