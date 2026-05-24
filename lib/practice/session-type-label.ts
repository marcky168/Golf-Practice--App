import { GAMES } from "./games";

const MODE_LABELS: Record<string, string> = {
  block: "Block",
  random: "Random",
  mixed: "Mixed",
  planned: "Planned",
};

/** Human-readable practice mode for stats / history (games → specific challenge name) */
export function practiceModeLabel(session: {
  type: string;
  title?: string | null;
  config?: unknown;
}): string {
  if (session.type === "game") {
    const gameId = (session.config as { gameId?: string } | null)?.gameId;
    const game = gameId ? GAMES.find(g => g.id === gameId) : undefined;
    if (game) return game.name;
    if (session.title) return session.title;
    return "Games";
  }
  return MODE_LABELS[session.type] ?? session.type;
}
