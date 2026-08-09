import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { DEVICE_INFO } from "@/lib/practice/equipment";
import type { Program } from "@/lib/programs/types";
import type { PhaseSummary } from "@/lib/programs/progress";

type Props = {
  program: Program;
  summaries: Record<string, PhaseSummary>;
};

/**
 * Module list for programs whose phases run in parallel. Nothing is locked —
 * the user picks whichever module matches what they're practising today.
 */
export function ModulePicker({ program, summaries }: Props) {
  const noun = program.phaseNoun ?? "Phase";

  return (
    <div className="space-y-3">
      {program.phases.map(phase => {
        const summary = summaries[phase.id];
        const sessions = summary?.sessions ?? 0;
        const keyDevices = (phase.equipment ?? []).filter(
          e => e.usage === "required" || e.usage === "recommended"
        );

        return (
          <div
            key={phase.id}
            className={`rounded-2xl border p-4 ${
              summary?.gateMet ? "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/15" : "bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {noun} {phase.number}
                  </span>
                  {summary?.gateMet && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Gate met
                    </span>
                  )}
                </div>
                <div className="font-semibold text-base leading-tight mt-0.5">{phase.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{phase.skillFocus}</div>
              </div>
              {phase.duration && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  {phase.duration}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              Cue: <span className="italic">&ldquo;{phase.cueCard.cue}&rdquo;</span>
            </div>

            {keyDevices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {keyDevices.map(e => (
                  <span
                    key={e.device}
                    className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${
                      e.usage === "required"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {DEVICE_INFO[e.device].name}
                    {e.usage === "required" ? " · required" : ""}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mt-3">
              <div className="text-[11px] text-muted-foreground">
                {sessions === 0
                  ? "Not started"
                  : `${sessions} session${sessions === 1 ? "" : "s"}${
                      summary?.lastGoodPct != null ? ` · last ${summary.lastGoodPct}%` : ""
                    }`}
              </div>
              <Link href={`/programs/${program.id}/session?phase=${phase.id}`}>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 min-h-[44px] text-sm font-semibold">
                  {sessions === 0 ? "Start" : "Run again"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
