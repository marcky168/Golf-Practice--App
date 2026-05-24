import type {
  BlockResult,
  BuilderFocus,
  CorrectionAnswer,
  ErrorCorrectionQuestionKey,
  RepRecordSnapshot,
  SessionConfig,
} from "./types";
import { isCorrectionAnswer } from "./types";

export type CorrectionTotals = Record<CorrectionAnswer, number>;

export type CorrectionSummary = {
  startedOnLine?: CorrectionTotals;
  trajectoryMatch?: CorrectionTotals;
  hitIntendedShot?: CorrectionTotals;
  focusCueMatch?: CorrectionTotals;
  totalAnswered: number;
};

const CORRECTION_KEYS: ErrorCorrectionQuestionKey[] = [
  "startedOnLine",
  "trajectoryMatch",
  "hitIntendedShot",
  "focusCueMatch",
];

const CORRECTION_LABELS: Record<ErrorCorrectionQuestionKey, string> = {
  startedOnLine: "Started on intended line",
  trajectoryMatch: "Matched trajectory",
  hitIntendedShot: "Hit the shot intended",
  focusCueMatch: "Committed to focus cue",
};

export function correctionLabel(key: ErrorCorrectionQuestionKey): string {
  return CORRECTION_LABELS[key];
}

function emptyTotals(): CorrectionTotals {
  return { yes: 0, partial: 0, no: 0 };
}

/** Aggregate error-correction answers across an array of rep records */
export function summarizeErrorCorrection(reps: RepRecordSnapshot[]): CorrectionSummary {
  const summary: CorrectionSummary = { totalAnswered: 0 };
  const totals: Partial<Record<ErrorCorrectionQuestionKey, CorrectionTotals>> = {};
  let anyAnswered = 0;

  for (const r of reps) {
    const ec = r.errorCorrection;
    if (!ec) continue;
    let answeredThisRep = false;
    for (const key of CORRECTION_KEYS) {
      const ans = ec[key];
      if (!isCorrectionAnswer(ans)) continue;
      const bucket = totals[key] ?? emptyTotals();
      bucket[ans] += 1;
      totals[key] = bucket;
      answeredThisRep = true;
    }
    if (answeredThisRep) anyAnswered += 1;
  }

  summary.startedOnLine = totals.startedOnLine;
  summary.trajectoryMatch = totals.trajectoryMatch;
  summary.hitIntendedShot = totals.hitIntendedShot;
  summary.focusCueMatch = totals.focusCueMatch;
  summary.totalAnswered = anyAnswered;
  return summary;
}

/** Pick the single biggest fix-this-next-block insight from a block's reps */
export function dominantBlockMiss(
  reps: RepRecordSnapshot[]
): { key: ErrorCorrectionQuestionKey; label: string; missCount: number; total: number } | null {
  const summary = summarizeErrorCorrection(reps);
  let best: { key: ErrorCorrectionQuestionKey; missCount: number; total: number } | null = null;

  for (const key of CORRECTION_KEYS) {
    const totals = summary[key];
    if (!totals) continue;
    const total = totals.yes + totals.partial + totals.no;
    if (total === 0) continue;
    // Weight "no" full and "partial" half — captures both clear misses and inconsistency
    const missScore = totals.no + totals.partial * 0.5;
    if (!best || missScore > best.missCount) {
      best = { key, missCount: missScore, total };
    }
  }

  if (!best || best.missCount === 0) return null;
  return { ...best, label: correctionLabel(best.key) };
}

export type TrendPoint = {
  date: string;
  label: string;
  avgRating: number | null;
  avgConsistency: number | null;
  sessionCount: number;
};

type SessionRow = {
  started_at: string;
  type: string;
  config: SessionConfig | null;
};

const FOCUS_LABELS: Record<BuilderFocus, string> = {
  "full-swing": "Full Swing",
  chipping: "Chipping",
  pitching: "Pitching",
  putting: "Putting",
  bunker: "Bunker",
};

export function getFocusLabel(focus: BuilderFocus): string {
  return FOCUS_LABELS[focus];
}

/** Aggregate per-focus trends from saved session configs */
export function computeFocusTrends(sessions: SessionRow[]): TrendPoint[] {
  const byFocus = new Map<BuilderFocus, { ratings: number[]; consistency: number[]; dates: string[] }>();

  for (const session of sessions) {
    const cfg = session.config;
    if (!cfg?.builderFocus && !cfg?.focusAreas?.length) continue;

    const focus = cfg.builderFocus ?? mapAreasToFocus(cfg.focusAreas);
    if (!focus) continue;

    const date = new Date(session.started_at).toISOString().split("T")[0];
    const entry = byFocus.get(focus) ?? { ratings: [], consistency: [], dates: [] };
    entry.dates.push(date);

    const reps = cfg.repRecords ?? [];
    for (const r of reps) {
      if (r.rating != null) entry.ratings.push(r.rating);
    }

    const blocks = cfg.blockResults ?? [];
    for (const b of blocks) {
      if (b.consistency != null) entry.consistency.push(b.consistency);
    }

    byFocus.set(focus, entry);
  }

  const points: TrendPoint[] = [];
  for (const [focus, data] of byFocus) {
    const avgRating = data.ratings.length
      ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10
      : null;
    const avgConsistency = data.consistency.length
      ? Math.round((data.consistency.reduce((a, b) => a + b, 0) / data.consistency.length) * 10) / 10
      : null;
    points.push({
      date: data.dates[data.dates.length - 1] ?? "",
      label: getFocusLabel(focus),
      avgRating,
      avgConsistency,
      sessionCount: data.dates.length,
    });
  }

  return points.sort((a, b) => b.sessionCount - a.sessionCount);
}

/** Weekly shot-quality trend (avg 1–5 rating per week) */
export function computeWeeklyRatingTrend(sessions: SessionRow[]): Array<{ week: string; avg: number; count: number }> {
  const byWeek = new Map<string, number[]>();

  for (const session of sessions) {
    const reps = session.config?.repRecords ?? [];
    const ratings = reps.map(r => r.rating).filter((r): r is number => r != null);
    if (ratings.length === 0) continue;

    const d = new Date(session.started_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().split("T")[0];
    const existing = byWeek.get(key) ?? [];
    byWeek.set(key, [...existing, ...ratings]);
  }

  return [...byWeek.entries()]
    .map(([week, ratings]) => ({
      week,
      avg: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
      count: ratings.length,
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-8);
}

function mapAreasToFocus(areas: string[]): BuilderFocus | null {
  if (areas.includes("putting")) return "putting";
  if (areas.includes("bunker")) return "bunker";
  if (areas.includes("wedges") || areas.includes("short-irons")) return "pitching";
  if (areas.includes("short-game")) return "chipping";
  if (areas.length > 0) return "full-swing";
  return null;
}

/** Per-rep records belonging to a specific block index */
export function repsForBlock(
  reps: RepRecordSnapshot[],
  blockIndex: number
): RepRecordSnapshot[] {
  return reps.filter(r => r.blockIndex === blockIndex);
}

export type ErrorCorrectionTrendRow = {
  key: ErrorCorrectionQuestionKey;
  label: string;
  yes: number;
  partial: number;
  no: number;
  total: number;
  /** 0–100 — share of answers that were fully successful */
  yesPct: number;
};

/** Roll up error-correction taps across all sessions (for History trends) */
export function computeAggregateErrorCorrection(sessions: SessionRow[]): ErrorCorrectionTrendRow[] {
  const allReps: RepRecordSnapshot[] = [];
  for (const session of sessions) {
    const reps = session.config?.repRecords ?? [];
    if (reps.length > 0) allReps.push(...reps);
  }

  const summary = summarizeErrorCorrection(allReps);
  if (summary.totalAnswered === 0) return [];

  const rows: ErrorCorrectionTrendRow[] = [];
  for (const key of CORRECTION_KEYS) {
    const totals = summary[key];
    if (!totals) continue;
    const total = totals.yes + totals.partial + totals.no;
    if (total === 0) continue;
    rows.push({
      key,
      label: correctionLabel(key),
      yes: totals.yes,
      partial: totals.partial,
      no: totals.no,
      total,
      yesPct: Math.round((totals.yes / total) * 100),
    });
  }

  return rows.sort((a, b) => a.yesPct - b.yesPct);
}

export function summarizeBlockResults(blocks: BlockResult[]): { avgConsistency: number | null; totalHits: number; totalMisses: number } {
  const withConsistency = blocks.filter(b => b.consistency != null);
  const avgConsistency = withConsistency.length
    ? Math.round((withConsistency.reduce((s, b) => s + (b.consistency ?? 0), 0) / withConsistency.length) * 10) / 10
    : null;
  const totalHits = blocks.reduce((s, b) => s + (b.hits ?? 0), 0);
  const totalMisses = blocks.reduce((s, b) => s + (b.misses ?? 0), 0);
  return { avgConsistency, totalHits, totalMisses };
}
