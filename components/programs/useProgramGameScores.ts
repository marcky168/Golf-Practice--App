"use client";

import { useEffect, useState } from "react";
import { getUserSessions } from "@/app/actions";
import { lastScoreFromSessions, personalBestFromSessions } from "@/lib/practice/game-scores";

export type GameScoreSummary = { last?: number; best?: number };

/**
 * Loads {last, best} scores for a set of scored games so program drill cards can
 * show the "beat your last by 1" target. One fetch covers every gameId in a phase.
 */
export function useProgramGameScores(gameIds: string[]): Record<string, GameScoreSummary> {
  const [scores, setScores] = useState<Record<string, GameScoreSummary>>({});
  const key = gameIds.filter(Boolean).sort().join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    getUserSessions(500)
      .then(sessions => {
        if (cancelled) return;
        const next: Record<string, GameScoreSummary> = {};
        for (const id of key.split(",")) {
          next[id] = {
            last: lastScoreFromSessions(sessions, id),
            best: personalBestFromSessions(sessions, id),
          };
        }
        setScores(next);
      })
      .catch(() => { /* offline / fetch failed — chips fall back to "Set your baseline" */ });
    return () => { cancelled = true; };
  }, [key]);

  return scores;
}
