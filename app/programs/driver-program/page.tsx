import Link from "next/link";
import { ArrowLeft, Play, Lock, CheckCircle2, Circle, BookOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getProgramById } from "@/lib/programs/registry";
import { computeProgramProgress } from "@/lib/programs/progress";
import { CueCardDisplay } from "@/components/programs/CueCardDisplay";
import type { SessionConfig } from "@/lib/practice/types";

const PROGRAM_ID = "driver-program";

export default async function DriverProgramOverviewPage() {
  const program = getProgramById(PROGRAM_ID);
  if (!program) {
    return <div className="p-8 text-center text-muted-foreground">Program not found.</div>;
  }

  // Load past program sessions
  const supabase = await createClient();
  let sessions: { started_at: string; config: SessionConfig | null }[] = [];
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("practice_sessions")
        .select("started_at, config")
        .eq("user_id", user.id)
        .order("started_at", { ascending: false })
        .limit(200);
      sessions = (data ?? []).map(s => ({
        started_at: s.started_at,
        config: s.config as SessionConfig | null,
      }));
    }
  }

  const progress = computeProgramProgress(program, sessions);
  const currentPhase = program.phases[progress.currentPhaseIndex];

  return (
    <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
      <Link href="/programs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Programs
      </Link>

      <h1 className="text-3xl font-semibold tracking-tighter mb-2">{program.name}</h1>
      <p className="text-muted-foreground mb-6">{program.fullDescription}</p>

      {/* Current phase + today's cue card */}
      <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 mb-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-primary font-semibold">
              You are here
            </div>
            <div className="text-xl font-semibold tracking-tight mt-0.5">
              Phase {currentPhase.number} — {currentPhase.name}
            </div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {currentPhase.skillFocus}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {progress.sessionsInCurrentPhase} session{progress.sessionsInCurrentPhase !== 1 ? "s" : ""} logged
              {currentPhase.gate.requiredConsecutiveSessions && (
                <> · gate needs {currentPhase.gate.requiredConsecutiveSessions} consecutive at {currentPhase.gate.requiredGoodPct ?? "—"}%</>
              )}
            </div>
          </div>
        </div>

        <CueCardDisplay card={currentPhase.cueCard} />

        <Link href={`/programs/${program.id}/session`}>
          <Button size="lg" className="w-full h-14 mt-4 text-base font-semibold">
            <Play className="mr-2 h-5 w-5" /> Start Today's Session
          </Button>
        </Link>

        {progress.lastOneThingNext && (
          <div className="mt-3 text-xs text-muted-foreground italic">
            Last session note: "{progress.lastOneThingNext}"
          </div>
        )}
      </div>

      {/* Phase timeline */}
      <h2 className="text-lg font-semibold tracking-tight mb-3">Phases</h2>
      <div className="space-y-2 mb-8">
        {program.phases.map((phase, i) => {
          const isPast = i < progress.currentPhaseIndex;
          const isCurrent = i === progress.currentPhaseIndex;
          const isLocked = i > progress.currentPhaseIndex && !progress.nextPhaseUnlocked;
          const isNextUnlocked = i === progress.currentPhaseIndex + 1 && progress.nextPhaseUnlocked;
          return (
            <div
              key={phase.id}
              className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${
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
                  <Circle className={`h-5 w-5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
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
                  {phase.skillFocus} · {phase.estimatedSessions.min}–{phase.estimatedSessions.max} sessions
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Cue: <span className="italic">"{phase.cueCard.cue}"</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Universal warm-up reference */}
      <div className="rounded-2xl border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm tracking-tight">Universal warm-up — every session</h3>
          <span className="text-xs text-muted-foreground ml-auto">{program.warmup.totalDuration}</span>
        </div>
        <div className="space-y-1.5">
          {program.warmup.blocks.map((b, i) => (
            <div key={i} className="text-xs text-muted-foreground leading-snug">
              <span className="font-medium text-foreground">{b.duration}:</span> {b.description}
            </div>
          ))}
        </div>
      </div>

      {/* Define "good shot" */}
      <div className="rounded-2xl border bg-card p-5 mb-6">
        <h3 className="font-semibold text-sm tracking-tight mb-2">Define a "good shot"</h3>
        <ul className="text-xs text-muted-foreground space-y-1 mb-2">
          {program.defineGoodShot.criteria.map((c, i) => (
            <li key={i}>• {c}</li>
          ))}
        </ul>
        <div className="text-xs font-medium text-foreground">{program.defineGoodShot.scoring}</div>
      </div>

      {/* Weekly schedule */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm tracking-tight">Weekly schedule</h3>
        </div>
        <div className="space-y-1.5">
          {program.weeklySchedule.map(d => (
            <div key={d.day} className="flex gap-3 text-xs">
              <span className="font-semibold text-foreground w-10 shrink-0">{d.day}</span>
              <span className="text-muted-foreground">{d.activity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
