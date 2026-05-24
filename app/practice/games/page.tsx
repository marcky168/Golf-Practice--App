import Link from "next/link";
import { ArrowLeft, Award } from "lucide-react";
import { GAMES } from "@/lib/practice/games";
import { getUserSessions } from "@/app/actions";
import { GamesHubGrid } from "@/components/practice/GamesHubGrid";

function isBetter(_gameId: string, a: number, b: number) {
  return a > b;
}

export default async function GamesHub() {
  const sessions = await getUserSessions(500);

  const bestScores: Record<string, number> = {};
  const attemptCounts: Record<string, number> = {};

  sessions
    .filter((s): s is typeof s & { score: number } => s.type === "game" && s.score != null)
    .forEach((s) => {
      const gameId = (s.config as { gameId?: string } | null)?.gameId;
      if (!gameId) return;
      attemptCounts[gameId] = (attemptCounts[gameId] ?? 0) + 1;
      if (bestScores[gameId] === undefined || isBetter(gameId, s.score, bestScores[gameId])) {
        bestScores[gameId] = s.score;
      }
    });

  return (
    <div className="min-h-screen bg-background pb-20 max-w-4xl mx-auto px-4 pt-6">
      <Link
        href="/practice"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Practice
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Award className="h-8 w-8 text-accent" />
        <h1 className="text-3xl font-semibold tracking-tighter">Games &amp; Challenges</h1>
      </div>
      <p className="text-muted-foreground mb-8 max-w-md">
        Pressure training that makes practice fun and builds real on-course performance.
      </p>

      <div className="mb-6 rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
        Games are excellent for building mental toughness and decision-making under pressure.
        Filter by focus — try <strong>Chipping</strong>, <strong>Putting</strong>, or <strong>Pitching</strong> when
        you&apos;re at the short-game area.
      </div>

      <GamesHubGrid games={GAMES} bestScores={bestScores} attemptCounts={attemptCounts} />

      <div className="mt-10 text-center text-xs text-muted-foreground">
        Pro tip: Play these under slight fatigue or with a friend for extra pressure.
      </div>
    </div>
  );
}
