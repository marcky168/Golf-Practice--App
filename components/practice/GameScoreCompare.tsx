"use client";

import { useEffect, useState } from "react";
import { Trophy, TrendingUp, Minus } from "lucide-react";
import {
  compareToPersonalBest,
  formatGameScore,
  type GameScoreOutcome,
} from "@/lib/practice/game-scores";

const OUTCOME_COPY: Record<
  GameScoreOutcome,
  { message: string; banner: string; deltaClass: string }
> = {
  first: {
    message: "First attempt — save to set your baseline",
    banner: "border-primary/30 bg-primary/5",
    deltaClass: "text-primary",
  },
  beat: {
    message: "New personal best!",
    banner: "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/35",
    deltaClass: "text-emerald-700 dark:text-emerald-400",
  },
  tie: {
    message: "Tied your personal best!",
    banner: "border-amber-400/60 bg-amber-50 dark:bg-amber-950/35",
    deltaClass: "text-amber-700 dark:text-amber-400",
  },
  miss: {
    message: "Short of your best — good reps still count",
    banner: "border-border bg-muted/40",
    deltaClass: "text-muted-foreground",
  },
};

type FrozenCompare = {
  outcome: GameScoreOutcome;
  /** PB at round end, before save bumps in-memory state */
  baseline?: number;
};

export function GameScoreCompare({
  gameId,
  score,
  personalBest,
  personalBestReady = true,
}: {
  gameId: string;
  score: number;
  /** Current all-time best (may update after save) */
  personalBest?: number;
  /** Wait for history load before locking beat/tie/miss */
  personalBestReady?: boolean;
}) {
  const [frozen, setFrozen] = useState<FrozenCompare | null>(null);

  useEffect(() => {
    if (!personalBestReady) return;
    setFrozen(prev => {
      if (prev !== null) return prev;
      return {
        outcome: compareToPersonalBest(score, personalBest),
        baseline: personalBest,
      };
    });
  }, [score, personalBest, personalBestReady]);

  const outcome = frozen?.outcome ?? compareToPersonalBest(score, personalBest);
  const compareBaseline = frozen?.baseline;
  const copy = OUTCOME_COPY[outcome];
  const delta =
    compareBaseline !== undefined ? score - compareBaseline : 0;

  return (
    <div className={`rounded-2xl border-2 p-4 ${copy.banner}`}>
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-0.5">
            This round
          </div>
          <div className="text-xl font-semibold tabular-nums leading-tight">
            {formatGameScore(gameId, score)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-0.5">
            Personal best
          </div>
          <div className="text-xl font-semibold tabular-nums leading-tight">
            {personalBest !== undefined ? formatGameScore(gameId, personalBest) : "—"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 font-medium min-w-0">
          {outcome === "beat" ? (
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : outcome === "tie" ? (
            <Minus className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <Trophy className="h-4 w-4 shrink-0 opacity-70" />
          )}
          <span className={outcome === "beat" ? "text-emerald-800 dark:text-emerald-200" : undefined}>
            {copy.message}
          </span>
        </div>
        {outcome === "beat" && compareBaseline !== undefined && (
          <span className={`font-semibold tabular-nums shrink-0 ${copy.deltaClass}`}>
            +{delta}
          </span>
        )}
        {outcome === "miss" && compareBaseline !== undefined && (
          <span className={`font-semibold tabular-nums shrink-0 ${copy.deltaClass}`}>
            {delta}
          </span>
        )}
        {outcome === "tie" && compareBaseline !== undefined && (
          <span className={`font-semibold tabular-nums shrink-0 ${copy.deltaClass}`}>
            Matched
          </span>
        )}
      </div>
    </div>
  );
}
