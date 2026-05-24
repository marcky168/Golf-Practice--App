import { correctionLabel, type CorrectionTotals } from "./trends";
import {
  isCorrectionAnswer,
  type CorrectionAnswer,
  type ErrorCorrectionQuestionKey,
  type RepRecordSnapshot,
} from "./types";

export type AdaptationSignal = {
  repNumber: number;
  club?: string;
  shape?: string;
  trajectory?: string;
  field: ErrorCorrectionQuestionKey;
  answer: Exclude<CorrectionAnswer, "yes">;
  label: string;
};

export type ErrorLogSummary = {
  /** partial + no taps — the brain's gating signals to adapt */
  adaptationSignals: number;
  yes: number;
  partial: number;
  no: number;
  totalAnswers: number;
  recentSignals: AdaptationSignal[];
};

const SIGNAL_FIELDS: ErrorCorrectionQuestionKey[] = [
  "startedOnLine",
  "trajectoryMatch",
  "hitIntendedShot",
  "focusCueMatch",
];

function isSignalAnswer(a: CorrectionAnswer): a is Exclude<CorrectionAnswer, "yes"> {
  return a === "partial" || a === "no";
}

/** Extract adaptation signals from rep records (partial/no = learning data, not failure) */
export function computeErrorLogSummary(reps: RepRecordSnapshot[]): ErrorLogSummary {
  const totals: CorrectionTotals = { yes: 0, partial: 0, no: 0 };
  const signals: AdaptationSignal[] = [];

  for (const rep of reps) {
    const ec = rep.errorCorrection;
    if (!ec) continue;
    for (const field of SIGNAL_FIELDS) {
      const ans = ec[field];
      if (!isCorrectionAnswer(ans)) continue;
      totals[ans] += 1;
      if (isSignalAnswer(ans)) {
        signals.push({
          repNumber: rep.repNumber,
          club: rep.drill?.club,
          shape: rep.shape,
          trajectory: rep.trajectory,
          field,
          answer: ans,
          label: correctionLabel(field),
        });
      }
    }
  }

  return {
    adaptationSignals: totals.partial + totals.no,
    yes: totals.yes,
    partial: totals.partial,
    no: totals.no,
    totalAnswers: totals.yes + totals.partial + totals.no,
    recentSignals: signals.slice(-8).reverse(),
  };
}

export type SessionRow = {
  started_at: string;
  config: { repRecords?: RepRecordSnapshot[] } | null;
};

/** Roll up adaptation signals across saved sessions */
export function computeAggregateErrorLog(sessions: SessionRow[]): {
  totalSignals: number;
  sessionsWithSignals: number;
  topFields: Array<{ label: string; count: number }>;
} {
  const fieldCounts = new Map<string, number>();
  let totalSignals = 0;
  let sessionsWithSignals = 0;

  for (const session of sessions) {
    const reps = session.config?.repRecords ?? [];
    if (reps.length === 0) continue;
    const summary = computeErrorLogSummary(reps);
    if (summary.adaptationSignals === 0) continue;
    sessionsWithSignals += 1;
    totalSignals += summary.adaptationSignals;
    for (const s of summary.recentSignals) {
      fieldCounts.set(s.label, (fieldCounts.get(s.label) ?? 0) + 1);
    }
  }

  const topFields = [...fieldCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { totalSignals, sessionsWithSignals, topFields };
}
