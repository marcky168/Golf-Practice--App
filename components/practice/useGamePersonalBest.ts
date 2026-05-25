"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserSessions } from "@/app/actions";
import { mergePersonalBest, personalBestFromSessions } from "@/lib/practice/game-scores";

/** Loads PB from history and keeps it updated after saves on the same page. */
export function useGamePersonalBest(gameId: string) {
  const [personalBest, setPersonalBest] = useState<number | undefined>(undefined);
  const [personalBestReady, setPersonalBestReady] = useState(false);

  const refresh = useCallback(() => {
    return getUserSessions(500).then(sessions => {
      const pb = personalBestFromSessions(sessions, gameId);
      setPersonalBest(pb);
      setPersonalBestReady(true);
      return pb;
    });
  }, [gameId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Call after a successful save so Try Again compares against this round. */
  const noteSavedScore = useCallback((score: number) => {
    setPersonalBest(prev => mergePersonalBest(prev, score));
  }, []);

  return { personalBest, noteSavedScore, refresh, personalBestReady };
}
