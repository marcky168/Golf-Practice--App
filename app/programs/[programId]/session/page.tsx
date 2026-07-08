import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProgramById } from "@/lib/programs/registry";
import { computeProgramProgress, todaysPhaseId } from "@/lib/programs/progress";
import { ProgramSessionRunner } from "@/components/programs/ProgramSessionRunner";
import type { SessionConfig } from "@/lib/practice/types";
import type { ProgramSessionStep } from "@/lib/programs/types";

const SESSION_STEPS: ProgramSessionStep[] = [
  "intro",
  "warmup",
  "compile-1",
  "micro-rest",
  "compile-2",
  "consolidate",
  "recap",
  "tracking",
];

function parseStep(value?: string): ProgramSessionStep | undefined {
  if (value && SESSION_STEPS.includes(value as ProgramSessionStep)) {
    return value as ProgramSessionStep;
  }
  return undefined;
}

type PageProps = {
  params: Promise<{ programId: string }>;
  searchParams: Promise<{ phase?: string; step?: string }>;
};

export default async function ProgramSessionPage({ params, searchParams }: PageProps) {
  const { programId } = await params;
  const { phase: phaseParam, step: stepParam } = await searchParams;
  const program = getProgramById(programId);
  if (!program) {
    return <div className="p-8 text-center text-muted-foreground">Program not found.</div>;
  }

  const supabase = await createClient();
  let sessions: { started_at: string; type?: string; score?: number | null; config: SessionConfig | null }[] = [];
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
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
  const overridePhaseId =
    phaseParam && program.phases.some(p => p.id === phaseParam) ? phaseParam : undefined;
  const phaseId = todaysPhaseId(program, progress, overridePhaseId);
  const phase = program.phases.find(p => p.id === phaseId) ?? program.phases[0];
  const sessionInPhase =
    progress.currentPhaseId === phase.id ? progress.sessionsInCurrentPhase + 1 : 1;
  const initialStep = parseStep(stepParam);
  const allowStepPicker = Boolean(overridePhaseId || initialStep);

  if (!phase) {
    return (
      <div className="p-8 text-center">
        <Link href={`/programs/${program.id}`} className="inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="h-4 w-4" /> Back to program
        </Link>
        <p className="text-muted-foreground mt-4">No active phase.</p>
      </div>
    );
  }

  return (
    <ProgramSessionRunner
      program={program}
      phase={phase}
      sessionInPhase={sessionInPhase}
      initialStep={initialStep}
      allowStepPicker={allowStepPicker}
      practiceMode={Boolean(overridePhaseId)}
    />
  );
}
