"use client";

import { computeAggregateErrorLog } from "@/lib/practice/error-log";
import type { SessionConfig } from "@/lib/practice/types";

type SessionRow = {
  started_at: string;
  config: SessionConfig | null;
};

export function ErrorLogTrends({ sessions }: { sessions: SessionRow[] }) {
  const agg = computeAggregateErrorLog(sessions);

  if (agg.totalSignals === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Log rest-timer feedback during sessions to build your adaptation signal log.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-violet-200/60 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-900/40 px-4 py-3 text-sm">
        <span className="font-semibold text-violet-900 dark:text-violet-200">{agg.totalSignals}</span>
        <span className="text-violet-800/80 dark:text-violet-300/80">
          {" "}
          adaptation signals across {agg.sessionsWithSignals} session
          {agg.sessionsWithSignals === 1 ? "" : "s"} — each one is useful learning data, not a failure.
        </span>
      </div>

      {agg.topFields.length > 0 && (
        <div>
          <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
            Most common signal types
          </div>
          <div className="space-y-2">
            {agg.topFields.map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="font-medium">{row.label}</span>
                <span className="text-muted-foreground tabular-nums">{row.count} taps</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
