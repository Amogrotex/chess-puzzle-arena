import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface PieceSet {
  id: string;
  name: string;
  hint: string;
  license: string;
}

/** All bundled sets live in `public/pieces/<id>/`. */
export const PIECE_SETS: PieceSet[] = [
  { id: 'caliente', name: 'Glossy', hint: 'Soft 3D shading — the default', license: 'CC BY-NC-SA 4.0' },
  { id: 'chessnut', name: 'Flat', hint: 'Rounded, flat and bold', license: 'Apache 2.0' },
  { id: 'kiwen-suwi', name: 'Minimal', hint: 'Single-stroke silhouettes', license: 'CC BY 4.0' },
  { id: 'spatial', name: 'Sharp', hint: 'Thin geometric line art', license: 'MIT' },
];

const KEY = 'puzzle-arena.piece-set';
export const DEFAULT_PIECE_SET = PIECE_SETS[0].id;

interface Ctx {
  pieceSet: string;
  setPieceSet: (id: string) => void;
}

const PieceSetContext = createContext<Ctx | null>(null);

export function PieceSetProvider({ children }: { children: ReactNode }) {
  const [pieceSet, setId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored && PIECE_SETS.some((s) => s.id === stored)) return stored;
    } catch {
      /* ignore */
    }
    return DEFAULT_PIECE_SET;
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, pieceSet);
    } catch {
      /* ignore */
    }
  }, [pieceSet]);

  const setPieceSet = useCallback((id: string) => {
    if (PIECE_SETS.some((s) => s.id === id)) setId(id);
  }, []);

  const value = useMemo(() => ({ pieceSet, setPieceSet }), [pieceSet, setPieceSet]);
  return <PieceSetContext.Provider value={value}>{children}</PieceSetContext.Provider>;
}

export function usePieceSet(): Ctx {
  const ctx = useContext(PieceSetContext);
  return ctx ?? { pieceSet: DEFAULT_PIECE_SET, setPieceSet: () => undefined };
}

/** URL of a piece inside the currently selected set. */
export function pieceSrc(set: string, piece: string): string {
  return `${import.meta.env.BASE_URL}pieces/${set}/${piece}.svg`;
}
