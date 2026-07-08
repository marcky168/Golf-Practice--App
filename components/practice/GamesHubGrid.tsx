"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Trophy } from "lucide-react";
import {
  filterGamesByCategory,
  GAME_CATEGORY_LABELS,
  GAME_FILTERS,
  type GameFilterId,
} from "@/lib/practice/games";
import { formatGameScore } from "@/lib/practice/game-scores";
import type { GameDefinition } from "@/lib/practice/types";

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
            const fmt = (s: number) => formatGameScore(game.id, s);

            return (
              <Card key={game.id} className="golf-card flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
                        {GAME_CATEGORY_LABELS[game.category]}
                      </span>
                      <CardTitle className="text-xl mt-1">{game.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 pt-1">
                      <Clock className="h-3 w-3" />
                      {game.estimatedMinutes} min
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                  <p className="text-sm text-muted-foreground leading-snug">
                    <span className="font-medium text-foreground">Why it helps: </span>
                    {game.whyItHelps}
                  </p>

                  <div
                    className={`rounded-xl px-3 py-2.5 flex items-center justify-between ${
                      hasPB ? "bg-accent/10 border border-accent/20" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Trophy className={`h-4 w-4 ${hasPB ? "text-accent" : "text-muted-foreground"}`} />
                      <div className="text-sm font-semibold">
                        {hasPB ? fmt(pb) : "No PB yet"}
                      </div>
                    </div>
                    {attempts > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {attempts} {attempts === 1 ? "play" : "plays"}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-1">
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
