import Link from "next/link";
import { ArrowLeft, Play, Lock, CheckCircle2, Circle, BookOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getProgramById } from "@/lib/programs/registry";
import { computeProgramProgress, phaseSummaries } from "@/lib/programs/progress";
import { describeGateProgress, sessionsForProgramProgress } from "@/lib/programs/dashboard";
import { CueCardDisplay } from "@/components/programs/CueCardDisplay";
import { ProgramTestingPanel } from "@/components/programs/ProgramTestingPanel";
import { ProgramDetailsAccordion } from "@/components/programs/ProgramDetailsAccordion";
import { ModulePicker } from "@/components/programs/ModulePicker";
import type { SessionConfig } from "@/lib/practice/types";

type PageProps = {
  params: Promise<{ programId: string }>;
};

export default async function ProgramOverviewPage({ params }: PageProps) {
  const { programId } = await params;
  const program = getProgramById(programId);
  if (!program) {
    return <div className="p-8 text-center text-muted-foreground">Program not found.</div>;
  }

  const supabase = await createClient();
  let sessions: {
    started_at: string;
    type?: string;
    score?: number | null;
    config: SessionConfig | null;
  }[] = [];
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("practice_sessions")
        .select("started_at, type, score, config")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(200);
      sessions = (data ?? []).map(s => ({
        started_at: s.started_at,
        type: s.type,
        score: s.score,
        config: s.config as SessionConfig | null,
      }));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progress = computeProgramProgress(program, sessions as any[]);
  const currentPhase = program.phases[progress.currentPhaseIndex];
  const anySessions = sessionsForProgramProgress(sessions);
  const gateUi = describeGateProgress(program, progress, anySessions);

  return (
    <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
      <Link
        href="/programs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Programs
      </Link>

      <h1 className="text-3xl font-semibold tracking-tighter mb-2">{program.name}</h1>
      <p className="text-muted-foreground mb-6 text-sm leading-relaxed line-clamp-3">
        {program.shortDescription}
      </p>

      {/* Parallel-module programs: pick today's module, nothing is locked */}
      {program.parallelPhases ? (
        <>
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 px-5 py-4 mb-5">
            <div className="text-[10px] uppercase tracking-widest text-primary font-semibold">
              Pick today&apos;s module
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-snug">
              All four are always available — choose the one that matches what you&apos;re
              working on. You&apos;ll set your equipment at the start of the session.
            </p>
            {progress.lastOneThingNext && (
              <div className="mt-3 text-xs text-muted-foreground italic">
                Last session note: &ldquo;{progress.lastOneThingNext}&rdquo;
              </div>
            )}
          </div>
          <div className="mb-8">
            <ModulePicker program={program} summaries={phaseSummaries(program, anySessions)} />
          </div>
        </>
      ) : (
        <>
      {/* Current phase + cue — above the fold */}
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 mb-6">
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-primary font-semibold">
            You are here
          </div>
          <div className="text-xl font-semibold tracking-tight mt-0.5">
            Phase {currentPhase.number} — {currentPhase.name}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">{currentPhase.skillFocus}</div>

          <div className="mt-3">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${Math.max(4, gateUi.pct)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1.5 leading-snug">{gateUi.label}</div>
          </div>
        </div>

        <CueCardDisplay card={currentPhase.cueCard} />

        <Link href={`/programs/${program.id}/session`}>
          <Button size="lg" className="w-full h-14 mt-4 text-base font-semibold">
            <Play className="mr-2 h-5 w-5" /> Start Today&apos;s Session
          </Button>
        </Link>

        {progress.lastOneThingNext && (
          <div className="mt-3 text-xs text-muted-foreground italic">
            Last session note: &ldquo;{progress.lastOneThingNext}&rdquo;
          </div>
        )}
      </div>

      {/* Phase timeline */}
      <h2 className="text-lg font-semibold tracking-tight mb-3">Phases</h2>
      <div className="space-y-2 mb-8">
        {program.phases.map((phase, i) => {
          const isPast = i < progress.currentPhaseIndex;
          const isCurrent = i === progress.currentPhaseIndex;
          const maxReachableIndex =
            progress.currentPhaseIndex + (progress.nextPhaseUnlocked ? 1 : 0);
          const isLocked = i > maxReachableIndex;
          const isNextUnlocked =
            i === progress.currentPhaseIndex + 1 && progress.nextPhaseUnlocked;
          return (
            <div
              key={phase.id}
              className={`rounded-xl border px-4 py-3 flex items-start gap-3 transition-opacity ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : isPast
                    ? "bg-card opacity-70"
                    : isLocked
                      ? "bg-muted/30 opacity-50"
                      : "bg-card"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isPast ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : isLocked ? (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Circle
                    className={`h-5 w-5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Phase {phase.number}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      Current
                    </span>
                  )}
                  {isNextUnlocked && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Unlocked
                    </span>
                  )}
                </div>
                <div className="font-semibold text-sm">{phase.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {phase.skillFocus} · {phase.estimatedSessions.min}–{phase.estimatedSessions.max}{" "}
                  sessions
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Cue: <span className="italic">&ldquo;{phase.cueCard.cue}&rdquo;</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      <div className="space-y-3 mb-6">
        <ProgramDetailsAccordion
          title="Default warm-up"
          icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
          meta={program.warmup.totalDuration}
        >
          {program.phases.some(p => p.warmup) && (
            <p className="text-[11px] text-muted-foreground mb-2 mt-3">
              Full-swing phases prescribe their own fuller warm-up in-session.
            </p>
          )}
          <div className="space-y-1.5 mt-3">
            {program.warmup.blocks.map((b, i) => (
              <div key={i} className="text-xs text-muted-foreground leading-snug">
                <span className="font-medium text-foreground">{b.duration}:</span> {b.description}
              </div>
            ))}
          </div>
        </ProgramDetailsAccordion>

        <ProgramDetailsAccordion title='Define a "good shot"'>
          <ul className="text-xs text-muted-foreground space-y-1 mb-2 mt-3">
            {program.defineGoodShot.criteria.map((c, i) => (
              <li key={i}>• {c}</li>
            ))}
          </ul>
          <div className="text-xs font-medium text-foreground">{program.defineGoodShot.scoring}</div>
        </ProgramDetailsAccordion>

        <ProgramDetailsAccordion
          title="Weekly schedule"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
        >
          <div className="space-y-1.5 mt-3">
            {program.weeklySchedule.map(d => (
              <div key={d.day} className="flex gap-3 text-xs">
                <span className="font-semibold text-foreground w-10 shrink-0">{d.day}</span>
                <span className="text-muted-foreground">{d.activity}</span>
              </div>
            ))}
          </div>
        </ProgramDetailsAccordion>

        <ProgramDetailsAccordion title="About this program">
          <p className="text-xs text-muted-foreground leading-relaxed mt-3">{program.fullDescription}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {program.estimatedWeeks.min}–{program.estimatedWeeks.max} weeks · {program.phases.length}{" "}
            phases
          </p>
        </ProgramDetailsAccordion>
      </div>

      {/* Testing tools — collapsed by default, below the fold */}
      <ProgramTestingPanel program={program} />
    </div>
  );
}
