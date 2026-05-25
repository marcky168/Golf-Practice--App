/** Format a raw game score for display (matches Games hub labels). */
export function formatGameScore(gameId: string, score: number): string {
  switch (gameId) {
    case "10-ball-accuracy":
      return `${score} / 50 pts`;
    case "up-and-down":
      return `${score} / 6 up & downs`;
    case "lag-putting-ladder":
    case "chip-ladder":
    case "pitch-ladder":
      return `${score} / 60 pts`;
    case "9-shot-matrix":
      return `${score} / 9 shots`;
    case "pressure-5":
      if (score >= 15) return "🔥🔥🔥 15 in a row";
      if (score >= 10) return "🔥🔥 10 in a row";
      if (score >= 5) return "🔥 5 in a row";
      return `${score} in a row`;
    case "random-3-hole":
      return `${score.toFixed(1)} / 5 avg feel`;
    case "arena-3-hole":
      return score === 6 ? "6 / 6 — Perfect" : `${score} / 6 hits`;
    case "landing-zone-8":
    case "pin-high-8":
      return `${score} / 40 pts`;
    case "bump-and-run-blitz":
      return `${score} / 6 inside 8 ft`;
    case "makeable-putt-ladder":
      return `${score} / 5 made`;
    case "clock-drill":
      return score === 4 ? "4 / 4 — Perfect" : `${score} / 4 made`;
    case "lag-to-tap-in":
      return `${score} / 30 pts`;
    case "wedge-window-6":
      return `${score} / 6 pin-high`;
    default:
      return String(score);
  }
}

export type GameScoreOutcome = "first" | "beat" | "tie" | "miss";

/** Compare this round's score to the saved personal best (higher = better). */
export function compareToPersonalBest(current: number, personalBest?: number): GameScoreOutcome {
  if (personalBest === undefined) return "first";
  if (current > personalBest) return "beat";
  if (current === personalBest) return "tie";
  return "miss";
}

export function personalBestFromSessions(
  sessions: Array<{ type: string; score?: number | null; config: unknown }>,
  gameId: string
): number | undefined {
  let best: number | undefined;
  for (const s of sessions) {
    if (s.type !== "game" || s.score == null) continue;
    const id = (s.config as { gameId?: string } | null)?.gameId;
    if (id !== gameId) continue;
    if (best === undefined || s.score > best) best = s.score;
  }
  return best;
}

/** After a save, merge this score into the running personal best (higher wins). */
export function mergePersonalBest(current: number | undefined, savedScore: number): number {
  if (current === undefined) return savedScore;
  return Math.max(current, savedScore);
}
