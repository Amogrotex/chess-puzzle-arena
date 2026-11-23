import { Chess } from 'chess.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pieceSrc } from '../lib/pieceSet';

export type Orientation = 'white' | 'black';
export interface Square {
  from: string;
  to: string;
}
export interface Arrow {
  from: string;
  to: string;
  color?: string;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export function fenToPieces(fen: string): Record<string, string> {
  const map: Record<string, string> = {};
  const rows = fen.split(' ')[0].split('/');
  rows.forEach((row, r) => {
    let file = 0;
    for (const ch of row) {
      if (ch >= '1' && ch <= '8') file += Number(ch);
      else {
        map[FILES[file] + (8 - r)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
        file += 1;
      }
    }
  });
  return map;
}

function squareToXY(square: string, orientation: Orientation) {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  return orientation === 'white' ? { x: file, y: 7 - rank } : { x: 7 - file, y: rank };
}

const PIECE_NAME: Record<string, string> = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

interface BoardProps {
  fen: string;
  orientation?: Orientation;
  interactive?: boolean;
  lastMove?: Square | null;
  arrows?: Arrow[];
  hintSquare?: string | null;
  shake?: boolean;
  onMove?: (move: { from: string; to: string; promotion?: string }) => void;
  onSelect?: (square: string | null) => void;
}

export default function Board({
  fen,
  orientation = 'white',
  interactive = true,
  lastMove,
  arrows = [],
  hintSquare,
  shake,
  onMove,
  onSelect,
}: BoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ from: string; piece: string; x: number; y: number } | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [slide, setSlide] = useState<{ from: string; to: string; key: number } | null>(null);

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return null;
    }
  }, [fen]);

  const pieces = useMemo(() => fenToPieces(fen), [fen]);
  const turn = game?.turn() ?? 'w';

  const kingInCheck = useMemo(() => {
    if (!game || !game.isCheck()) return null;
    const color = game.turn() === 'w' ? 'w' : 'b';
    const king = Object.entries(pieces).find(([, p]) => p === `${color}K`);
    return king ? king[0] : null;
  }, [game, pieces]);

  const legalTargets = useMemo(() => {
    if (!game || !selected) return [];
    try {
      return game.moves({ square: selected as never, verbose: true }).map((m) => m.to as string);
    } catch {
      return [];
    }
  }, [game, selected]);

  /* -------------------------------------------------- last-move animation */
  useEffect(() => {
    if (!lastMove) return;
    setSlide({ ...lastMove, key: Date.now() });
  }, [lastMove?.from, lastMove?.to]);

  useEffect(() => {
    setSelected(null);
    setDrag(null);
    setPendingPromotion(null);
  }, [fen]);

  useEffect(() => {
    onSelect?.(selected);
  }, [selected, onSelect]);

  const squareFromPoint = useCallback(
    (clientX: number, clientY: number): string | null => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const x = Math.floor(((clientX - rect.left) / rect.width) * 8);
      const y = Math.floor(((clientY - rect.top) / rect.height) * 8);
      if (x < 0 || x > 7 || y < 0 || y > 7) return null;
      return orientation === 'white'
        ? `${FILES[x]}${8 - y}`
        : `${FILES[7 - x]}${y + 1}`;
    },
    [orientation],
  );

  const tryMove = useCallback(
    (from: string, to: string) => {
      if (!game || !interactive) return;
      const piece = pieces[from];
      if (!piece) return;
      const isLegal = legalTargets.includes(to);
      if (!isLegal) return;
      const isPromotion =
        piece[1] === 'P' && ((piece[0] === 'w' && to[1] === '8') || (piece[0] === 'b' && to[1] === '1'));
      if (isPromotion) {
        setPendingPromotion({ from, to });
        setSelected(null);
        return;
      }
      setSelected(null);
      onMove?.({ from, to });
    },
    [game, interactive, legalTargets, onMove, pieces],
  );

  const onPointerDown = (e: React.PointerEvent, square: string) => {
    if (!interactive) return;
    const piece = pieces[square];
    if (selected && legalTargets.includes(square)) {
      tryMove(selected, square);
      return;
    }
    if (!piece || piece[0] !== turn) {
      setSelected(null);
      return;
    }
    e.preventDefault();
    setSelected(square);
    setDrag({ from: square, piece, x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    if (!drag) return;
    let moved = false;
    const start = { x: drag.x, y: drag.y };

    const move = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) moved = true;
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    };
    const up = (e: PointerEvent) => {
      const target = squareFromPoint(e.clientX, e.clientY);
      const from = drag.from;
      setDrag(null);
      if (moved && target && target !== from) tryMove(from, target);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, squareFromPoint, tryMove]);

  const squares = useMemo(() => {
    const out: { square: string; x: number; y: number; light: boolean }[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const file = orientation === 'white' ? x : 7 - x;
        const rank = orientation === 'white' ? 8 - y : y + 1;
        const square = `${FILES[file]}${rank}`;
        out.push({ square, x, y, light: (file + rank) % 2 === 1 });
      }
    }
    return out;
  }, [orientation]);

  const dragOffset = drag
    ? (() => {
        const rect = boardRef.current?.getBoundingClientRect();
        if (!rect) return { dx: 0, dy: 0 };
        const size = rect.width / 8;
        const origin = squareToXY(drag.from, orientation);
        const px = rect.left + (origin.x + 0.5) * size;
        const py = rect.top + (origin.y + 0.5) * size;
        return { dx: drag.x - px, dy: drag.y - py };
      })()
    : null;

  return (
    <div className="relative">
      <div
        ref={boardRef}
        className={`relative grid aspect-square w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-md shadow-[0_6px_18px_rgba(0,0,0,.45)] ring-1 ring-black/40 ${
          shake ? 'animate-shake' : ''
        }`}
        style={{ touchAction: 'none' }}
      >
        {squares.map(({ square, light }) => {
          const piece = pieces[square];
          const isSelected = selected === square;
          const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
          const isTarget = legalTargets.includes(square);
          const isCaptureTarget = isTarget && !!piece;
          const isHint = hintSquare === square;

          const slideForSquare =
            slide && slide.to === square && piece ? slide : null;
          let slideStyle: React.CSSProperties | undefined;
          if (slideForSquare) {
            const a = squareToXY(slideForSquare.from, orientation);
            const b = squareToXY(slideForSquare.to, orientation);
            slideStyle = {
              ['--dx' as string]: `${(a.x - b.x) * 100}%`,
              ['--dy' as string]: `${(a.y - b.y) * 100}%`,
            };
          }

          const isDragging = drag?.from === square;
          const file = square[0];
          const rank = square[1];
          const showFile = orientation === 'white' ? rank === '1' : rank === '8';
          const showRank = orientation === 'white' ? file === 'a' : file === 'h';

          return (
            <div
              key={square}
              data-square={square}
              onPointerDown={(e) => onPointerDown(e, square)}
              className="relative flex items-center justify-center"
              style={{ backgroundColor: light ? 'var(--board-light)' : 'var(--board-dark)' }}
            >
              {(isLast || isSelected) && <div className="absolute inset-0 bg-board-hl/45" />}
              {isHint && <div className="square-hint pointer-events-none absolute inset-0 z-10" />}
              {kingInCheck === square && (
                <div
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,64,32,.85) 8%, rgba(255,64,32,.35) 42%, transparent 72%)',
                  }}
                />
              )}

              {piece && (
                <div
                  key={slideForSquare ? `slide-${slideForSquare.key}` : 'static'}
                  className={`absolute inset-0 z-20 ${slideForSquare ? 'piece-slide' : ''} ${
                    isDragging ? 'z-40 opacity-90' : ''
                  }`}
                  style={{
                    ...slideStyle,
                    transform: isDragging && dragOffset ? `translate(${dragOffset.dx}px, ${dragOffset.dy}px) scale(1.08)` : undefined,
                    cursor: interactive && piece[0] === turn ? 'grab' : 'default',
                  }}
                >
                  <img
                    src={pieceSrc(piece)}
                    alt={`${PIECE_NAME[piece[1]] ?? 'piece'} ${piece[0] === 'w' ? 'white' : 'black'}`}
                    className="piece-img"
                    draggable={false}
                  />
                </div>
              )}

              {isTarget && !isCaptureTarget && (
                <div className="pointer-events-none absolute z-30 h-[28%] w-[28%] rounded-full bg-black/25" />
              )}
              {isCaptureTarget && (
                <div className="pointer-events-none absolute inset-[6%] z-30 rounded-full border-[6px] border-black/20" />
              )}

              {showFile && (
                <span
                  className="board-coords pointer-events-none absolute bottom-0.5 right-1 text-[9px] font-bold opacity-70"
                  style={{ color: light ? '#769656' : '#eeeed2' }}
                >
                  {file}
                </span>
              )}
              {showRank && (
                <span
                  className="board-coords pointer-events-none absolute left-1 top-0.5 text-[9px] font-bold opacity-70"
                  style={{ color: light ? '#769656' : '#eeeed2' }}
                >
                  {rank}
                </span>
              )}
            </div>
          );
        })}

        {/* arrows overlay */}
        <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full" viewBox="0 0 8 8">
          <defs>
            {arrows.map((a, i) => (
              <marker
                key={i}
                id={`arrowhead-${i}`}
                markerWidth="4"
                markerHeight="4"
                refX="2.6"
                refY="2"
                orient="auto"
              >
                <path d="M0,0 L4,2 L0,4 z" fill={a.color ?? 'rgba(129,182,76,.9)'} />
              </marker>
            ))}
          </defs>
          {arrows.map((a, i) => {
            const s = squareToXY(a.from, orientation);
            const e = squareToXY(a.to, orientation);
            return (
              <line
                key={i}
                x1={s.x + 0.5}
                y1={s.y + 0.5}
                x2={e.x + 0.5}
                y2={e.y + 0.5}
                stroke={a.color ?? 'rgba(129,182,76,.85)'}
                strokeWidth={0.18}
                strokeLinecap="round"
                markerEnd={`url(#arrowhead-${i})`}
                opacity={0.9}
              />
            );
          })}
        </svg>

        {/* promotion picker */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="animate-popIn rounded-xl border border-ink-500 bg-ink-700 p-3 shadow-pop">
              <p className="mb-2 text-center text-xs font-semibold text-ink-200">Promote to</p>
              <div className="flex gap-1">
                {['q', 'r', 'b', 'n'].map((p) => {
                  const color = pieces[pendingPromotion.from]?.[0] ?? 'w';
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        const move = pendingPromotion;
                        setPendingPromotion(null);
                        onMove?.({ from: move.from, to: move.to, promotion: p });
                      }}
                      className="h-14 w-14 rounded-lg bg-ink-600 p-1 transition hover:bg-grass-400/30 hover:ring-2 hover:ring-grass-400"
                    >
                      <img src={pieceSrc(`${color}${p.toUpperCase()}`)} alt={p} className="piece-img" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
