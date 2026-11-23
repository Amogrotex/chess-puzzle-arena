import { Chess } from 'chess.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type MoveResponse, type PuzzleInfo, type Session } from '../lib/api';
import { fenToPieces } from '../components/Board';
import type { BadgeKind } from '../components/MoveBadge';
import { sound } from '../lib/sound';

export type Phase = 'loading' | 'ready' | 'opponent' | 'solved' | 'failed' | 'revealed' | 'error';

export interface MoveAnim {
  from: string;
  to: string;
}

interface Options {
  mode: 'train' | 'daily' | 'rush';
  theme?: string;
  difficulty?: string;
  autoLoad?: boolean;
  onSolved?: (res: MoveResponse) => void;
  onFailed?: (res: MoveResponse) => void;
  onNewSession?: (session: Session) => void;
}

export function usePuzzle({ mode, theme, difficulty, autoLoad = true, onSolved, onFailed, onNewSession }: Options) {
  const [session, setSession] = useState<Session | null>(null);
  const [fen, setFen] = useState('');
  const [phase, setPhase] = useState<Phase>('loading');
  const [lastMove, setLastMove] = useState<MoveAnim | null>(null);
  const [arrows, setArrows] = useState<{ from: string; to: string; color?: string }[]>([]);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [badges, setBadges] = useState<{ square: string; kind: BadgeKind }[]>([]);
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [solution, setSolution] = useState<{ uci: string; san: string }[]>([]);
  const [puzzle, setPuzzle] = useState<PuzzleInfo | null>(null);
  const [ratingDelta, setRatingDelta] = useState<number | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  const timers = useRef<number[]>([]);
  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const applySession = useCallback((s: Session) => {
    setSession(s);
    setFen(s.fen);
    setLastMove(null);
    setArrows([]);
    setHintSquare(null);
    setBadges([]);
    setSolution([]);
    setPuzzle(null);
    setRatingDelta(null);
    setHintsUsed(0);
    setPhase('ready');
    onNewSession?.(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(
    async (signal?: { cancelled: boolean }) => {
      clearTimers();
      setPhase('loading');
      setBusy(false);
      setError(null);
      try {
        if (mode === 'daily') {
          const res = await api.daily();
          if (signal?.cancelled) return;
          setAlreadyPlayed(res.alreadyPlayedToday);
          applySession(res.session);
          return;
        }
        const res = await api.next({ theme, difficulty, mode: mode === 'rush' ? 'rush' : undefined });
        if (signal?.cancelled) return;
        applySession(res.session);
      } catch (err) {
        if (signal?.cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load puzzle');
        setPhase('error');
      }
    },
    [applySession, difficulty, mode, theme],
  );

  const cancelRef = useRef({ cancelled: false });

  useEffect(() => {
    if (!autoLoad) return;
    cancelRef.current = { cancelled: false };
    void load(cancelRef.current);
    return () => {
      cancelRef.current.cancelled = true;
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme, difficulty, autoLoad]);

  /** Rough chess.com-style annotation for the move the player just found. */
  const classifyMove = useCallback(
    (res: MoveResponse, themes: string[]): BadgeKind => {
      let mate = false;
      try {
        mate = new Chess(res.fen).isCheckmate();
      } catch {
        /* ignore */
      }
      if (themes.includes('sacrifice')) return 'brilliant';
      if (themes.includes('quietMove') || themes.includes('defensiveMove')) return 'great';
      if (mate) return 'best';
      return 'best';
    },
    [],
  );

  const playMove = useCallback(
    async (move: { from: string; to: string; promotion?: string }) => {
      if (!session || phase !== 'ready' || busy) return;
      setBusy(true);
      setArrows([]);
      setHintSquare(null);
      setBadges([]);
      const wasCapture = !!fenToPieces(fen)[move.to];

      try {
        const res = await api.move(session.sessionId, move.from, move.to, move.promotion);
        if (res.illegal) {
          sound.wrong();
          setBusy(false);
          return;
        }

        if (!res.correct) {
          sound.wrong();
          setShake(true);
          timers.current.push(window.setTimeout(() => setShake(false), 400));
          setFen(res.fen);
          setPhase('failed');
          setSolution(res.solution ?? []);
          setPuzzle(res.puzzle ?? null);
          setBusy(false);
          onFailed?.(res);
          return;
        }

        // the player's move was right
        setFen(res.fen);
        setLastMove({ from: move.from, to: move.to });
        setBadges([{ square: move.to, kind: classifyMove(res, session.themes) }]);
        if (wasCapture) sound.capture();
        else sound.move();

        if (res.reply) {
          setPhase('opponent');
          timers.current.push(
            window.setTimeout(() => {
              setFen(res.reply!.fen);
              setLastMove({ from: res.reply!.from, to: res.reply!.to });
              if (res.reply!.check) sound.check();
              else sound.move();
              setPhase('ready');
              setBusy(false);
            }, 190),
          );
        }

        if (res.finished) {
          timers.current.push(
            window.setTimeout(() => {
              setPhase('solved');
              sound.solved();
              setPuzzle(res.puzzle ?? null);
              setRatingDelta(res.rating?.delta ?? null);
              setBusy(false);
              onSolved?.(res);
            }, res.reply ? 420 : 60),
          );
        } else if (!res.reply) {
          setBusy(false);
        }
      } catch (err) {
        console.error(err);
        setBusy(false);
      }
    },
    [busy, classifyMove, fen, onFailed, onSolved, phase, session],
  );

  const takeHint = useCallback(async () => {
    if (!session || phase !== 'ready') return;
    try {
      const level = Math.min(3, hintsUsed + 1);
      const res = await api.hint(session.sessionId, level);
      setHintsUsed(level);
      if (level === 1 && res.from) {
        setHintSquare(res.from);
        sound.tick();
      } else if (res.from && res.to) {
        setHintSquare(null);
        setArrows([{ from: res.from, to: res.to, color: 'rgba(129,182,76,.9)' }]);
        sound.tick();
      }
    } catch (err) {
      console.error(err);
    }
  }, [hintsUsed, phase, session]);

  const revealSolution = useCallback(async () => {
    if (!session || phase === 'solved') return;
    clearTimers();
    try {
      const res = await api.solution(session.sessionId);
      setSolution(res.solution);
      setPuzzle(res.puzzle);
      setPhase('revealed');
      setHintsUsed(3);
      setRatingDelta(res.rating?.delta ?? null);
      // animate the whole line from the start position
      const board = new Chess(session.fen);
      let delay = 220;
      res.solution.forEach((m, i) => {
        const uci = m.uci;
        const nextFen = (() => {
          const clone = new Chess(board.fen());
          clone.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
          return clone.fen();
        })();
        board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
        timers.current.push(
          window.setTimeout(() => {
            setFen(nextFen);
            setLastMove({ from: uci.slice(0, 2), to: uci.slice(2, 4) });
            setBadges([{ square: uci.slice(2, 4), kind: i % 2 === 0 ? 'best' : 'forced' }]);
            sound.move();
          }, delay),
        );
        delay += 480;
      });
    } catch (err) {
      console.error(err);
    }
  }, [phase, session]);

  const retry = useCallback(async () => {
    if (!session) return;
    clearTimers();
    try {
      const res = await api.retry(session.sessionId);
      applySession(res.session);
    } catch (err) {
      console.error(err);
    }
  }, [applySession, session]);

  const skip = useCallback(async () => {
    if (!session) return;
    try {
      await api.skip(session.sessionId);
    } catch {
      /* ignore */
    }
    void load(cancelRef.current);
  }, [load, session]);

  return {
    session,
    fen,
    phase,
    busy,
    lastMove,
    arrows,
    hintSquare,
    badges,
    badge: badges[0] ?? null,
    shake,
    solution,
    puzzle,
    ratingDelta,
    hintsUsed,
    error,
    alreadyPlayed,
    load,
    playMove,
    takeHint,
    revealSolution,
    retry,
    skip,
  };
}
