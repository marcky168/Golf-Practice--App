import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Award, Clock, Trophy } from "lucide-react";
import { GAMES } from "@/lib/practice/games";
import { getUserSessions } from "@/app/actions";

// ─── Score formatting per game ────────────────────────────────────────────────
const scoreLabel: Record<string, (score: number) => string> = {
  "10-ball-accuracy":   s => `${s} / 50 pts`,
  "up-and-down":        s => `${s} / 6 up & downs`,
  "lag-putting-ladder": s => `${s} / 60 pts`,
  "9-shot-matrix":      s => `${s} / 9 shots`,
  "pressure-5":         s => s >= 15 ? "🔥🔥🔥 15 in a row ✓" : s >= 10 ? "🔥🔥 10 in a row ✓" : s >= 5 ? "🔥 5 in a row ✓" : `Best streak: ${s}`,
  "random-9":           s => `${s.toFixed(1)} / 5 avg feel`,
};

// Higher score = better for all games
function isBetter(gameId: string, a: number, b: number) {
  return a > b;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function GamesHub() {
  const sessions = await getUserSessions(500);

  // Build personal-best map: gameId → best score
  const bestScores: Record<string, number> = {};
  const attemptCounts: Record<string, number> = {};

  sessions
    .filter((s): s is typeof s & { score: number } => s.type === "game" && s.score != null)
    .forEach(s => {
      const gameId = (s.config as any)?.gameId as string | undefined;
      if (!gameId) return;
      attemptCounts[gameId] = (attemptCounts[gameId] ?? 0) + 1;
      if (bestScores[gameId] === undefined || isBetter(gameId, s.score, bestScores[gameId])) {
        bestScores[gameId] = s.score;
      }
    });

  return (
    <div className="min-h-screen bg-background pb-20 max-w-4xl mx-auto px-4 pt-6">
      <Link href="/practice" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
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
        Try <strong>10-Ball Accuracy</strong> or <strong>Lag Putting Ladder</strong> first — they&apos;re the most valuable.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {GAMES.map((game) => {
          const pb = bestScores[game.id];
          const attempts = attemptCounts[game.id] ?? 0;
          const hasPB = pb !== undefined;
          const fmt = scoreLabel[game.id];

          return (
            <Card key={game.id} className="golf-card flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{game.name}</CardTitle>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {game.estimatedMinutes} min
                  </div>
                </div>
                <CardDescription className="pt-1">{game.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="text-sm bg-muted/60 rounded-lg p-3">
                  <span className="font-medium text-primary">Why it helps:</span> {game.whyItHelps}
                </div>

                {/* Personal best */}
                <div className={`rounded-xl p-4 flex items-center justify-between ${
                  hasPB
                    ? "bg-accent/10 border border-accent/20"
                    : "bg-muted/30 border border-dashed"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      hasPB ? "bg-accent/20" : "bg-muted"
                    }`}>
                      <Trophy className={`h-4 w-4 ${hasPB ? "text-accent" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground tracking-wide">PERSONAL BEST</div>
                      <div className={`text-sm font-semibold mt-0.5 ${hasPB ? "text-foreground" : "text-muted-foreground"}`}>
                        {hasPB && fmt ? fmt(pb) : "No attempts yet"}
                      </div>
                    </div>
                  </div>
                  {attempts > 0 && (
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-xs text-muted-foreground">{attempts} {attempts === 1 ? "play" : "plays"}</div>
                    </div>
                  )}
                </div>

                <div className="mt-auto">
                  <Link href={`/practice/games/${game.id}`}>
                    <Button size="lg" className="w-full">
                      {hasPB ? "Play Again" : "Play Now"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 text-center text-xs text-muted-foreground">
        Pro tip: Play these under slight fatigue or with a friend for extra pressure.
      </div>
    </div>
  );
}
