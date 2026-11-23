/**
 * Simple Elo rating: the player plays a "match" against the puzzle.
 * Solving it counts as a win, failing counts as a loss.
 */
export function expectedScore(playerRating: number, puzzleRating: number): number {
  return 1 / (1 + 10 ** ((puzzleRating - playerRating) / 400));
}

export function kFactor(playerRating: number, totalGames: number): number {
  if (totalGames < 30) return 40; // provisional: move faster
  if (playerRating >= 2400) return 16;
  if (playerRating >= 2000) return 24;
  return 32;
}

export function ratingDelta(
  playerRating: number,
  puzzleRating: number,
  score: 0 | 1,
  totalGames = 100,
): number {
  const k = kFactor(playerRating, totalGames);
  const delta = k * (score - expectedScore(playerRating, puzzleRating));
  // never swing by less than 1 point, never more than 40
  const rounded = Math.round(delta);
  if (rounded === 0) return score === 1 ? 1 : -1;
  return Math.max(-40, Math.min(40, rounded));
}

export function newRating(playerRating: number, puzzleRating: number, score: 0 | 1, totalGames = 100): number {
  return Math.max(400, Math.min(3200, playerRating + ratingDelta(playerRating, puzzleRating, score, totalGames)));
}
