"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Trophy } from "lucide-react";
import {
  filterGamesByCategory,
  GAME_CATEGORY_LABELS,
  GAME_FILTERS,
  type GameFilterId,
} from "@/lib/practice/games";
import type { GameDefinition } from "@/lib/practice/types";

const scoreLabel: Record<string, (score: number) => string> = {
  "10-ball-accuracy": (s) => `${s} / 50 pts`,
  "up-and-down": (s) => `${s} / 6 up & downs`,
  "lag-putting-ladder": (s) => `${s} / 60 pts`,
  "9-shot-matrix": (s) => `${s} / 9 shots`,
  "pressure-5": (s) =>
    s >= 15
      ? "🔥🔥🔥 15 in a row ✓"
      : s >= 10
        ? "🔥🔥 10 in a row ✓"
        : s >= 5
          ? "🔥 5 in a row ✓"
          : `Best streak: ${s}`,
  "random-3-hole": (s) => `${s.toFixed(1)} / 5 avg feel`,
  "arena-3-hole": (s) => (s === 6 ? "6 / 6 — Perfect 🏆" : `${s} / 6 hits`),
  "chip-ladder": (s) => `${s} / 60 pts`,
  "landing-zone-8": (s) => `${s} / 40 pts`,
  "bump-and-run-blitz": (s) => `${s} / 6 inside 8 ft`,
  "makeable-putt-ladder": (s) => `${s} / 5 made`,
  "clock-drill": (s) => (s === 4 ? "4 / 4 — Perfect" : `${s} / 4 made`),
  "lag-to-tap-in": (s) => `${s} / 30 pts`,
  "pitch-ladder": (s) => `${s} / 60 pts`,
  "pin-high-8": (s) => `${s} / 40 pts`,
  "wedge-window-6": (s) => `${s} / 6 pin-high`,
};

const difficultyLabel: Record<GameDefinition["difficulty"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

type Props = {
  games: GameDefinition[];
  bestScores: Record<string, number>;
  attemptCounts: Record<string, number>;
};

export function GamesHubGrid({ games, bestScores, attemptCounts }: Props) {
  const [filter, setFilter] = useState<GameFilterId>("all");

  const visibleGames = useMemo(() => filterGamesByCategory(games, filter), [games, filter]);

  return (
    <>
      <div className="mb-6">
        <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
          Filter by focus
        </div>
        <div className="flex flex-wrap gap-2">
          {GAME_FILTERS.map((item) => {
            const active = filter === item.id;
            const count =
              item.id === "all"
                ? games.length
                : games.filter((g) => g.category === item.id).length;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`min-h-[44px] px-4 py-2 rounded-full border text-sm font-medium transition active:scale-[0.985] ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted border-border"
                }`}
              >
                {item.label}
                <span className={`ml-1.5 tabular-nums ${active ? "opacity-80" : "text-muted-foreground"}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visibleGames.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-card">
          <p className="text-lg font-medium">No games in this category yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Try another filter above.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visibleGames.map((game) => {
            const pb = bestScores[game.id];
            const attempts = attemptCounts[game.id] ?? 0;
            const hasPB = pb !== undefined;
            const fmt = scoreLabel[game.id];

            return (
              <Card key={game.id} className="golf-card flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {GAME_CATEGORY_LABELS[game.category]}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-muted-foreground">
                          {difficultyLabel[game.difficulty]}
                        </span>
                      </div>
                      <CardTitle className="text-2xl">{game.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 pt-1">
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

                  <div
                    className={`rounded-xl p-4 flex items-center justify-between ${
                      hasPB ? "bg-accent/10 border border-accent/20" : "bg-muted/30 border border-dashed"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          hasPB ? "bg-accent/20" : "bg-muted"
                        }`}
                      >
                        <Trophy className={`h-4 w-4 ${hasPB ? "text-accent" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground tracking-wide">
                          PERSONAL BEST
                        </div>
                        <div
                          className={`text-sm font-semibold mt-0.5 ${hasPB ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {hasPB && fmt ? fmt(pb) : "No attempts yet"}
                        </div>
                      </div>
                    </div>
                    {attempts > 0 && (
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-xs text-muted-foreground">
                          {attempts} {attempts === 1 ? "play" : "plays"}
                        </div>
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
      )}
    </>
  );
}
