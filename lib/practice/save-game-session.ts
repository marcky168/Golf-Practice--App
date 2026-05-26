"use client";

import { savePracticeSession, type SaveSessionInput } from "@/app/actions";

/** Saves a game session and updates in-memory personal best when save succeeds. */
export async function saveGameSession(
  input: SaveSessionInput,
  noteSavedScore?: (score: number, club?: string) => void
) {
  const res = await savePracticeSession(input);
  if (res.success && input.score != null) {
    const club = (input.config as { club?: string } | null)?.club;
    noteSavedScore?.(input.score, club);
  }
  return res;
}
