/**
 * Piece artwork — Lichess "staunty" set by sadsnake1 (CC BY-NC-SA 4.0):
 * flat, clean and very close to the classic "neo" style.
 *
 * All files live in `public/pieces/<PIECE_SET>/<color><Piece>.svg`.
 */
export const PIECE_SET = 'staunty';

export function pieceSrc(piece: string): string {
  return `${import.meta.env.BASE_URL}pieces/${PIECE_SET}/${piece}.svg`;
}
