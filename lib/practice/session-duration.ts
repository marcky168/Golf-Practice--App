/** Minutes between two timestamps (minimum 1 for any completed session). */
export function durationMinutesFromRange(
  startedAt: string | number | Date,
  endedAt: string | number | Date
): number {
  const startMs =
    typeof startedAt === "number" ? startedAt : new Date(startedAt).getTime();
  const endMs =
    typeof endedAt === "number" ? endedAt : new Date(endedAt).getTime();
  const seconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
  if (seconds < 60) return 1;
  return Math.round(seconds / 60);
}

export function buildSessionTiming(startedAtMs: number, endedAtMs = Date.now()) {
  const startedAt = new Date(startedAtMs).toISOString();
  const endedAt = new Date(endedAtMs).toISOString();
  return {
    startedAt,
    endedAt,
    durationMinutes: durationMinutesFromRange(startedAtMs, endedAtMs),
  };
}

/** Prefer started_at → ended_at when present; falls back to stored duration_minutes. */
export function getSessionDurationMinutes(session: {
  duration_minutes?: number | null;
  started_at: string;
  ended_at?: string | null;
  type?: string;
}): number {
  if (session.type === "planned") return session.duration_minutes ?? 0;

  if (session.started_at && session.ended_at) {
    const fromRange = durationMinutesFromRange(session.started_at, session.ended_at);
    if (fromRange > 0) return fromRange;
  }

  return session.duration_minutes ?? 0;
}

/** Completed practice only — excludes calendar plans from hour totals. */
export function getLoggedPracticeMinutes(
  sessions: Array<{
    duration_minutes?: number | null;
    started_at: string;
    ended_at?: string | null;
    type?: string;
  }>
): number {
  return sessions
    .filter(s => s.type !== "planned")
    .reduce((sum, s) => sum + getSessionDurationMinutes(s), 0);
}
