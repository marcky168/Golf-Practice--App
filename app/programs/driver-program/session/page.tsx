import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProgramById } from "@/lib/programs/registry";
import { computeProgramProgress, todaysPhaseId } from "@/lib/programs/progress";
import { ProgramSessionRunner } from "@/components/programs/ProgramSessionRunner";
import type { SessionConfig } from "@/lib/practice/types";

const PROGRAM_ID = "driver-program";

export default async function DriverProgramSessionPage() {
  const program = getProgramById(PROGRAM_ID);
  if (!program) {
    return <div className="p-8 text-center text-muted-foreground">Program not found.</div>;
  }

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

  const progress  = computeProgramProgress(program, sessions);
  const phaseId   = todaysPhaseId(program, progress);
  const phase     = program.phases.find(p => p.id === phaseId) ?? program.phases[0];
  const sessionInPhase = progress.currentPhaseId === phase.id
    ? progress.sessionsInCurrentPhase + 1
    : 1;

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
    />
  );
}
