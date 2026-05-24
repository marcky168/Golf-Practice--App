"use client";

import { computeErrorLogSummary } from "@/lib/practice/error-log";
import type { RepRecordSnapshot, RepErrorCorrection } from "@/lib/practice/types";

const COACHING_CUES: Partial<Record<keyof RepErrorCorrection, string>> = {
  startedOnLine:   "Next shot: pick a tighter start line and check face angle at address",
  trajectoryMatch: "Next shot: commit to your finish height before you swing",
  hitIntendedShot: "Next shot: full visual of the complete shot before stepping in",
  focusCueMatch:   "Next shot: say the cue out loud before you address the ball",
};

export function ErrorLogPanel({ reps }: { reps: RepRecordSnapshot[] }) {
  const summary = computeErrorLogSummary(reps);

  // Stay hidden until the first adaptation signal — no need to show a
  // "0 signals" state, and a clean session shouldn't display the panel at all.
  if (summary.adaptationSignals === 0) return null;

  // Find the field that's showing up most in recent signals → coaching cue
  const fieldCounts = summary.recentSignals.reduce<Partial<Record<keyof RepErrorCorrection, number>>>(
    (acc, s) => { acc[s.field] = (acc[s.field] ?? 0) + 1; return acc; },
    {}
  );
  const topField = (
    Object.entries(fieldCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
  ) as keyof RepErrorCorrection | undefined;
  const coachingCue = topField ? COACHING_CUES[topField] : undefined;

  return (
    <div className="w-full max-w-md mb-4 rounded-2xl border border-violet-200/60 bg-violet-50/80 dark:bg-violet-950/25 dark:border-violet-900/50 px-4 py-3 text-left">
      <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-violet-700 dark:text-violet-300 mb-1">
        Adaptation signals
      </div>

      <div className="flex flex-wrap gap-3 text-sm tabular-nums mb-2">
        <span className="font-semibold text-violet-900 dark:text-violet-100">
          {summary.adaptationSignals} signals
        </span>
        <span className="text-muted-foreground">
          {summary.yes} clean · {summary.partial} partial · {summary.no} miss
        </span>
      </div>

      {coachingCue && (
        <p className="text-xs font-medium text-violet-800 dark:text-violet-200 mb-2 leading-snug">
          {coachingCue}
        </p>
      )}

      {summary.recentSignals.length > 0 && (
        <div className="pt-2 border-t border-violet-200/50 dark:border-violet-800/50 space-y-1">
          {summary.recentSignals.slice(0, 3).map((s, i) => (
            <div key={`${s.repNumber}-${s.field}-${i}`} className="text-[11px] text-muted-foreground">
              <span className="text-violet-800 dark:text-violet-200 font-medium">
                {s.answer === "no" ? "Miss" : "Partial"}
              </span>
              {" · "}
              {s.club ?? "Shot"}{s.shape ? ` · ${s.shape}` : ""} — {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
