import { durationMinutesFromRange } from "./session-duration";
import type { BlockResult, RepRecordSnapshot, SessionConfig } from "./types";
import { computeErrorLogSummary } from "./error-log";

export type SessionCompletionTiming = {
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
};

/** Map SessionRunner / game completion payload into savePracticeSession timing fields */
export function timingFromCompletion(result: {
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
}): SessionCompletionTiming {
  const endedAt = result.endedAt ?? new Date().toISOString();
  const startedAt = result.startedAt ?? endedAt;
  const durationMinutes =
    result.startedAt && result.endedAt
      ? durationMinutesFromRange(result.startedAt, result.endedAt)
      : (result.durationMinutes ?? 1);
  return { startedAt, endedAt, durationMinutes };
}

/** Merge live session data into config snapshot for history / trends */
export function enrichConfigForSave(
  config: SessionConfig,
  extras: {
    repRecords?: RepRecordSnapshot[];
    blockResults?: BlockResult[];
  }
): SessionConfig {
  const errorLogSummary =
    extras.repRecords && extras.repRecords.length > 0
      ? (() => {
          const s = computeErrorLogSummary(extras.repRecords);
          return {
            adaptationSignals: s.adaptationSignals,
            yes: s.yes,
            partial: s.partial,
            no: s.no,
          };
        })()
      : undefined;

  return {
    ...config,
    repRecords: extras.repRecords,
    blockResults: extras.blockResults,
    ...(errorLogSummary ? { errorLogSummary } : {}),
  };
}
