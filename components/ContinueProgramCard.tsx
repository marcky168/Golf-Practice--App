import Link from "next/link";
import { GraduationCap, ChevronRight, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProgramContinueCard } from "@/lib/programs/dashboard";
import { PROGRAMS } from "@/lib/programs/registry";

type Props = {
  /** Primary program to continue (or start) */
  primary: ProgramContinueCard;
  /** When true, show a compact "browse all" affordance if multiple programs exist */
  showBrowseAll?: boolean;
};

/**
 * Single primary next-action for programs on the dashboard.
 * Shows the active phase + gate progress instead of a hardcoded Driver label.
 */
export function ContinueProgramCard({ primary, showBrowseAll = true }: Props) {
  const started = primary.progress.totalProgramSessions > 0;
  const href = started ? primary.href : "/programs";
  const title = started ? `Continue ${primary.program.name}` : "Structured programs";
  const subtitle = started
    ? `Phase ${primary.phaseNumber} — ${primary.phaseName}`
    : "Break 90 Scoring Method · Driver Program — pick a plan";

  return (
    <div className="space-y-2">
      <Link href={href} className="block">
        <Card className="border-l-4 border-l-primary hover:shadow-md transition cursor-pointer overflow-hidden">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-0.5">
                  {started ? "Continue program" : "Programs"}
                </div>
                <div className="font-semibold truncate">{title}</div>
                <div className="text-sm text-muted-foreground truncate">{subtitle}</div>
                {started && (
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(4, primary.gatePct)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      {primary.gateLabel}
                    </div>
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {started ? (
                  <Button size="sm" className="gap-1.5 pointer-events-none" tabIndex={-1}>
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </Button>
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
      {showBrowseAll && started && PROGRAMS.length > 1 && (
        <div className="flex justify-end px-1">
          <Link
            href="/programs"
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Browse all {PROGRAMS.length} programs →
          </Link>
        </div>
      )}
    </div>
  );
}
