"use client";

import { computeAggregateErrorCorrection } from "@/lib/practice/trends";
import type { SessionConfig } from "@/lib/practice/types";

type SessionRow = {
  started_at: string;
  type: string;
  config: SessionConfig | null;
};

function CorrectionBar({
  yesPct,
  partialPct,
  noPct,
}: {
  yesPct: number;
  partialPct: number;
  noPct: number;
}) {
  return (
    <div className="flex h-3 rounded-full overflow-hidden bg-muted">
      {yesPct > 0 && <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />}
      {partialPct > 0 && <div className="bg-amber-400" style={{ width: `${partialPct}%` }} />}
      {noPct > 0 && <div className="bg-red-500" style={{ width: `${noPct}%` }} />}
    </div>
  );
}

export function ErrorCorrectionTrends({ sessions }: { sessions: SessionRow[] }) {
  const rows = computeAggregateErrorCorrection(sessions);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Use block or builder sessions with rest-timer feedback to see patterns here.
      </p>
    );
  }

  const weakest = rows[0];

  return (
    <div className="space-y-4">
      {weakest && weakest.yesPct < 70 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-4 py-3 text-sm">
          <span className="font-medium text-amber-900 dark:text-amber-200">Focus next range visit: </span>
          <span className="text-amber-800 dark:text-amber-300">{weakest.label}</span>
          <span className="text-amber-700/80 dark:text-amber-400/80"> ({weakest.yesPct}% yes across logged shots)</span>
        </div>
      )}

      {rows.map(row => {
        const partialPct = Math.round((row.partial / row.total) * 100);
        const noPct = Math.round((row.no / row.total) * 100);
        return (
          <div key={row.key}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium">{row.label}</span>
              <span className="text-muted-foreground tabular-nums text-xs">
                {row.yesPct}% yes · {row.total} taps
              </span>
            </div>
            <CorrectionBar yesPct={row.yesPct} partialPct={partialPct} noPct={noPct} />
          </div>
        );
      })}

      <div className="flex gap-4 text-[10px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Yes
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" /> Partial
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> No
        </span>
      </div>
    </div>
  );
}
