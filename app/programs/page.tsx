import Link from "next/link";
import { ArrowLeft, GraduationCap, ChevronRight } from "lucide-react";
import { PROGRAMS } from "@/lib/programs/registry";
import { getUserSessions } from "@/app/actions";
import {
  getProgramContinueCards,
  sessionsForProgramProgress,
} from "@/lib/programs/dashboard";

export default async function ProgramsHubPage() {
  const sessions = await getUserSessions(200);
  const cards = getProgramContinueCards(sessionsForProgramProgress(sessions));
  const byId = Object.fromEntries(cards.map(c => [c.program.id, c]));

  return (
    <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <GraduationCap className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tighter">Programs</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Structured multi-phase training plans. Pick one and follow it phase by phase — each session
        builds on the last.
      </p>

      <div className="grid gap-4">
        {PROGRAMS.map(program => {
          const card = byId[program.id];
          const started = card && card.progress.totalProgramSessions > 0;
          return (
            <Link key={program.id} href={`/programs/${program.id}`}>
              <div className="rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md transition cursor-pointer p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-lg tracking-tight">{program.name}</div>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">
                      {program.shortDescription}
                    </p>
                    {started && card ? (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-primary">
                          Phase {card.phaseNumber} — {card.phaseName}
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.max(4, card.gatePct)}%` }}
                          />
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1">{card.gateLabel}</div>
                      </div>
                    ) : (
                      <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
                        <span>{program.phases.length} phases</span>
                        <span>·</span>
                        <span>
                          {program.estimatedWeeks.min}–{program.estimatedWeeks.max} weeks
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10">
        Programs are isolated from your regular practice sessions — your history and insights remain
        untouched.
      </p>
    </div>
  );
}
