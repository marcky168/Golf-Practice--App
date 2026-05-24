/** Huberman-aligned ultradian practice ceiling — ~90 min focused motor work */
export const ULTRADIAN_MAX_MINUTES = 90;
export const ULTRADIAN_WARN_MINUTES = 75;
export const ULTRADIAN_MAX_SECONDS = ULTRADIAN_MAX_MINUTES * 60;
export const ULTRADIAN_WARN_SECONDS = ULTRADIAN_WARN_MINUTES * 60;

export function formatSessionClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ultradianProgress(elapsedSeconds: number): number {
  return Math.min(100, Math.round((elapsedSeconds / ULTRADIAN_MAX_SECONDS) * 100));
}
