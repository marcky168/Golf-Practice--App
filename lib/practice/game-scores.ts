/** Games where personal best is tracked per club (stored in session config.club). */
export const CLUB_SCOPED_GAME_IDS = [
  "chip-ladder",
  "landing-zone-8",
  "bump-and-run-blitz",
  "up-and-down",
] as const;

export type ClubScopedGameId = (typeof CLUB_SCOPED_GAME_IDS)[number];

/** Normalize club names for consistent PB lookup ("56°" vs "56 °"). */
export function normalizeClubKey(club: string): string {
  return club.trim().toLowerCase();
}

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

/**
 * Highest achievable raw score per game — used to clamp target-score progression
 * so we never prescribe an impossible "beat it by 1". Streak games (pressure-5)
 * are unbounded and intentionally omitted.
 */
export const GAME_SCORE_MAX: Record<string, number> = {
  "10-ball-accuracy": 50,
  "up-and-down": 6,
  "lag-putting-ladder": 60,
  "chip-ladder": 60,
  "pitch-ladder": 60,
  "9-shot-matrix": 9,
  "random-3-hole": 5,
  "arena-3-hole": 6,
  "landing-zone-8": 40,
  "pin-high-8": 40,
  "bump-and-run-blitz": 6,
  "makeable-putt-ladder": 5,
  "clock-drill": 4,
  "lag-to-tap-in": 30,
  "wedge-window-6": 6,
};

/** Most recent saved score for a game across all clubs (null when never played). */
export function lastScoreFromSessions(
  sessions: Array<{ type: string; score?: number | null; started_at?: string; config: unknown }>,
  gameId: string
): number | undefined {
  let latest: { at: string; score: number } | undefined;
  for (const s of sessions) {
    if (s.type !== "game" || s.score == null) continue;
    if ((s.config as { gameId?: string } | null)?.gameId !== gameId) continue;
    const at = s.started_at ?? "";
    if (!latest || at.localeCompare(latest.at) > 0) latest = { at, score: s.score };
  }
  return latest?.score;
}

/**
 * The next target score for the "beat your last by 1" mechanic.
 * Clamped to the game's ceiling; returns the ceiling itself when already maxed.
 */
export function nextTargetScore(gameId: string, last: number): number {
  const next = Math.floor(last) + 1;
  const max = GAME_SCORE_MAX[gameId];
  return max === undefined ? next : Math.min(next, max);
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

/** Best score per club from saved game sessions (requires config.club). */
export function personalBestByClubFromSessions(
  sessions: Array<{ type: string; score?: number | null; config: unknown }>,
  gameId: string
): Record<string, number> {
  const best: Record<string, number> = {};
  for (const s of sessions) {
    if (s.type !== "game" || s.score == null) continue;
    const cfg = s.config as { gameId?: string; club?: string } | null;
    if (cfg?.gameId !== gameId) continue;
    const club = cfg.club?.trim();
    if (!club) continue;
    const key = normalizeClubKey(club);
    if (best[key] === undefined || s.score > best[key]) best[key] = s.score;
  }
  return best;
}

export function personalBestForClub(
  bestByClub: Record<string, number>,
  club: string | null | undefined
): number | undefined {
  if (!club?.trim()) return undefined;
  return bestByClub[normalizeClubKey(club)];
}
