"use client";

import { useCallback, useEffect, useState } from "react";
import { getUserSessions } from "@/app/actions";
import {
  mergePersonalBest,
  normalizeClubKey,
  personalBestByClubFromSessions,
  personalBestForClub,
  personalBestFromSessions,
} from "@/lib/practice/game-scores";

/**
 * Loads personal best for a game.
 * Pass `club` for club-scoped games (chip ladder, landing zone, etc.).
 */
export function useGamePersonalBest(gameId: string, club?: string | null) {
  const [bestByClub, setBestByClub] = useState<Record<string, number>>({});
  const [overallBest, setOverallBest] = useState<number | undefined>(undefined);
  const [personalBestReady, setPersonalBestReady] = useState(false);

  const clubScoped = Boolean(club?.trim());

  const personalBest = clubScoped
    ? personalBestForClub(bestByClub, club)
    : overallBest;

  const refresh = useCallback(() => {
    return getUserSessions(500).then(sessions => {
      setBestByClub(personalBestByClubFromSessions(sessions, gameId));
      setOverallBest(personalBestFromSessions(sessions, gameId));
      setPersonalBestReady(true);
      return sessions;
    });
  }, [gameId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Call after a successful save so Try Again compares against this round. */
  const noteSavedScore = useCallback((score: number, savedClub?: string) => {
    setOverallBest(prev => mergePersonalBest(prev, score));
    const key = savedClub?.trim();
    if (key) {
      const norm = normalizeClubKey(key);
      setBestByClub(prev => ({
        ...prev,
        [norm]: mergePersonalBest(prev[norm], score),
      }));
    }
  }, []);

  return { personalBest, bestByClub, noteSavedScore, refresh, personalBestReady };
}
