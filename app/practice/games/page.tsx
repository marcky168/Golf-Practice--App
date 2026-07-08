import Link from "next/link";
import { ArrowLeft, Award, GraduationCap } from "lucide-react";
import { GAMES } from "@/lib/practice/games";
import { getUserSessions } from "@/app/actions";
import { GamesHubGrid } from "@/components/practice/GamesHubGrid";
import { personalBestFromSessions } from "@/lib/practice/game-scores";
import {
  recommendedGameIdsForActivePrograms,
  sessionsForProgramProgress,
} from "@/lib/programs/dashboard";

export default async function GamesHub() {
  const sessions = await getUserSessions(500);

  const bestScores: Record<string, number> = {};
  const attemptCounts: Record<string, number> = {};

  sessions
    .filter((s): s is typeof s & { score: number } => s.type === "game" && s.score != null)
    .forEach(s => {
      const gameId = (s.config as { gameId?: string } | null)?.gameId;
      if (!gameId) return;
      attemptCounts[gameId] = (attemptCounts[gameId] ?? 0) + 1;
    });

  for (const game of GAMES) {
    const pb = personalBestFromSessions(sessions, game.id);
    if (pb !== undefined) bestScores[game.id] = pb;
  }

  const programRecs = recommendedGameIdsForActivePrograms(sessionsForProgramProgress(sessions));
  const recommended = programRecs
    .map(r => {
      const game = GAMES.find(g => g.id === r.gameId);
      if (!game) return null;
      return { game, programName: r.programName, phaseName: r.phaseName };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .slice(0, 3);

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
      <p className="text-muted-foreground mb-6 max-w-md">
        Pressure training that makes practice fun and builds real on-course performance.
      </p>

      {recommended.length > 0 && (
        <div className="mb-8 rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-4 w-4 text-primary" />
            <div className="text-xs font-bold tracking-widest text-primary uppercase">
              For your current program
            </div>
          </div>
          <div className="space-y-2">
            {recommended.map(({ game, programName, phaseName }) => (
              <Link
                key={game.id}
                href={`/practice/games/${game.id}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-card border px-4 py-3 min-h-[52px] hover:border-primary/40 transition active:scale-[0.99]"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{game.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {programName} · {phaseName}
                  </div>
                </div>
                <span className="text-xs font-medium text-primary shrink-0">Play →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <GamesHubGrid games={GAMES} bestScores={bestScores} attemptCounts={attemptCounts} />

      <div className="mt-10 text-center text-xs text-muted-foreground">
        Pro tip: Play these under slight fatigue or with a friend for extra pressure.
      </div>
    </div>
  );
}
