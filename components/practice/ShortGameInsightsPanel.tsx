"use client";

import type { LieInsight } from "@/lib/practice/insights";

function SuccessBar({ rate, isBest }: { rate: number; isBest: boolean }) {
  const color = rate >= 70
    ? "bg-emerald-500"
    : rate >= 50
    ? "bg-amber-500"
    : "bg-rose-500";
  return (
    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${isBest ? color : "bg-muted-foreground/40"}`}
        style={{ width: `${rate}%` }}
      />
    </div>
  );
}

function OutcomePips({ good, mishit, wrong }: { good: number; mishit: number; wrong: number }) {
  const total = good + mishit + wrong;
  if (total === 0) return null;
  return (
    <div className="flex gap-0.5 mt-1">
      {Array.from({ length: good   }).map((_, i) => (
        <div key={`g${i}`} className="w-2 h-2 rounded-full bg-emerald-500" />
      ))}
      {Array.from({ length: mishit }).map((_, i) => (
        <div key={`m${i}`} className="w-2 h-2 rounded-full bg-amber-400" />
      ))}
      {Array.from({ length: wrong  }).map((_, i) => (
        <div key={`w${i}`} className="w-2 h-2 rounded-full bg-rose-500" />
      ))}
    </div>
  );
}

interface Props {
  insights: LieInsight[];
}

export function ShortGameInsightsPanel({ insights }: Props) {
  if (insights.length === 0) {
    return (
      <div className="rounded-2xl border bg-muted/30 px-5 py-6 text-center">
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          Play short game sessions and log your club choice + outcome to unlock this analysis.
          Needs at least 3 rated shots per lie type.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Good execution</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Mishit</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> Wrong club</span>
      </div>

      {insights.map(lie => (
        <div key={lie.lie} className="rounded-2xl border bg-card p-4">
          {/* Lie header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-sm leading-snug">{lie.lie}</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">{lie.totalReps} shots logged</p>
            </div>
            {lie.bestClub && (
              <div className="text-right shrink-0 ml-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Best club</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{lie.bestClub}</div>
              </div>
            )}
          </div>

          {/* Club breakdown */}
          <div className="space-y-2.5 mb-3">
            {lie.clubs.map(club => {
              const isBest = club.club === lie.bestClub;
              const isMostUsed = club.club === lie.mostUsed;
              return (
                <div key={club.club}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium w-20 shrink-0 ${
                      isBest ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                    }`}>
                      {club.club}
                      {isBest && " ★"}
                      {isMostUsed && !isBest && " ·"}
                    </span>
                    <SuccessBar rate={club.successRate} isBest={isBest} />
                    <span className={`text-xs tabular-nums font-semibold w-9 text-right shrink-0 ${
                      isBest ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    }`}>
                      {club.successRate}%
                    </span>
                    <span className="text-[10px] text-muted-foreground w-12 text-right shrink-0">
                      {club.totalReps} rep{club.totalReps !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="ml-20 pl-2">
                    <OutcomePips
                      good={club.goodCount}
                      mishit={club.mishitCount}
                      wrong={club.wrongClubCount}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coaching insight */}
          {lie.insight && (
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/50 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-300 leading-snug">
              💡 {lie.insight}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
