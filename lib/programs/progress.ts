/**
 * Program progress logic — reads past program sessions and computes:
 *   • which phase the user is currently on
 *   • whether the gate for that phase has been met (strict mode)
 *   • how many sessions have been logged in the current phase
 *
 * Program sessions are stored as practice_sessions with
 *   type: "block"
 *   config.programId: <program id>
 *   config.programLog: ProgramSessionLog
 *
 * No DB migration needed — programLog is just a new field on SessionConfig.
 */
import type { Program, ProgramSessionLog } from "./types";

type AnySession = {
  started_at: string;
  /** Row-level type/score — present for scored-game sessions (used by gameGate) */
  type?: string;
  score?: number | null;
  config: { programId?: string; programLog?: ProgramSessionLog; gameId?: string } | null;
};

export type { AnySession };

/** Count saved scored-game rounds for a game that met (>=) the target score. */
function passingGameRounds(sessions: AnySession[], gameId: string, targetScore: number): number {
  return sessions.filter(
    s => s.type === "game" && s.score != null && s.score >= targetScore && s.config?.gameId === gameId
  ).length;
}

export interface ProgramProgress {
  currentPhaseIndex: number;
  currentPhaseId: string;
  sessionsInCurrentPhase: number;
  totalProgramSessions: number;
  gateMet: boolean;          // is the current phase's gate satisfied?
  nextPhaseUnlocked: boolean; // gate met AND next phase exists
  lastSessionAt: string | null;
  lastFeel?: string | null;
  lastOneThingNext?: string | null;
  /**
   * True for programs whose phases are parallel modules. Nothing is ever
   * locked, so "currentPhase" means "last one you ran", not "the one you're
   * allowed to run", and nextPhaseUnlocked is always false.
   */
  parallel: boolean;
}

/** Real (non-practice) sessions for one program, oldest first */
function programSessions(sessions: AnySession[], programId: string): ProgramSessionLog[] {
  return sessions
    .filter(
      s =>
        s.config?.programId === programId &&
        s.config?.programLog &&
        !s.config.programLog.practiceMode
    )
    .map(s => ({ ...s.config!.programLog!, _startedAt: s.started_at }))
    .sort((a, b) => (a as any)._startedAt.localeCompare((b as any)._startedAt));
}

export function computeProgramProgress(
  program: Program,
  sessions: AnySession[]
): ProgramProgress {
  const logs = programSessions(sessions, program.id);
  const parallel = Boolean(program.parallelPhases);

  if (logs.length === 0) {
    // No program sessions yet, but scored-game rounds can still satisfy phase 1's gate.
    const gate0 = program.phases[0].gate;
    let gateMet = false;
    if (gate0.gameGate) {
      const { gameId, targetScore, requiredSessions } = gate0.gameGate;
      gateMet = passingGameRounds(sessions, gameId, targetScore) >= requiredSessions;
    }
    return {
      currentPhaseIndex: 0,
      currentPhaseId: program.phases[0].id,
      sessionsInCurrentPhase: 0,
      totalProgramSessions: 0,
      gateMet,
      nextPhaseUnlocked: !parallel && gateMet && program.phases.length > 1,
      lastSessionAt: null,
      parallel,
    };
  }

  // Latest session's phase = current phase
  const latest = logs[logs.length - 1];
  let currentPhaseId = latest.phaseId;
  let currentPhaseIndex = program.phases.findIndex(p => p.id === currentPhaseId);
  if (currentPhaseIndex === -1) currentPhaseIndex = 0;
  currentPhaseId = program.phases[currentPhaseIndex].id;

  const sessionsInCurrentPhase = logs.filter(l => l.phaseId === currentPhaseId).length;
  const currentPhase = program.phases[currentPhaseIndex];
  const gate = currentPhase.gate;

  // Check gate: required N consecutive sessions hitting required %
  let gateMet = false;
  if (!gate.requiredConsecutiveSessions) {
    // No gate criteria = open-ended phase (e.g. Integration)
    gateMet = false;
  } else {
    const needed = gate.requiredConsecutiveSessions;
    const phaseLogs = logs.filter(l => l.phaseId === currentPhaseId);
    if (phaseLogs.length >= needed) {
      const recent = phaseLogs.slice(-needed);
      if (gate.requiredGoodPct != null) {
        gateMet = recent.every(l => l.goodPct >= gate.requiredGoodPct!);
      } else if (gate.requiresVideoConfirmation) {
        // Honour-system: video-confirmation gates pass on N consecutive sessions
        // (the user self-confirms in the tracking sheet).
        gateMet = true;
      } else {
        gateMet = true;
      }
    }
  }

  // Alternative path: enough passing scored-game rounds also satisfies the gate.
  if (!gateMet && gate.gameGate) {
    const { gameId, targetScore, requiredSessions } = gate.gameGate;
    gateMet = passingGameRounds(sessions, gameId, targetScore) >= requiredSessions;
  }

  // Parallel modules are never locked, so there is nothing to "unlock".
  const nextPhaseUnlocked =
    !parallel && gateMet && currentPhaseIndex < program.phases.length - 1;

  return {
    currentPhaseIndex,
    currentPhaseId,
    sessionsInCurrentPhase,
    totalProgramSessions: logs.length,
    gateMet,
    nextPhaseUnlocked,
    lastSessionAt: (latest as any)._startedAt,
    lastFeel: latest.bestFeel ?? null,
    lastOneThingNext: latest.oneThingNext ?? null,
    parallel,
  };
}

export interface PhaseSummary {
  phaseId: string;
  sessions: number;
  lastSessionAt: string | null;
  /** goodPct of the most recent session in this phase */
  lastGoodPct: number | null;
  /** Gate satisfied for this phase specifically */
  gateMet: boolean;
}

/**
 * Per-phase stats, for programs that present every phase at once rather than
 * a single "current" one. Evaluates each phase's gate against its own logs.
 */
export function phaseSummaries(
  program: Program,
  sessions: AnySession[]
): Record<string, PhaseSummary> {
  const logs = programSessions(sessions, program.id);
  const out: Record<string, PhaseSummary> = {};

  for (const phase of program.phases) {
    const phaseLogs = logs.filter(l => l.phaseId === phase.id);
    const latest = phaseLogs[phaseLogs.length - 1];
    const gate = phase.gate;

    let gateMet = false;
    const needed = gate.requiredConsecutiveSessions;
    if (needed && phaseLogs.length >= needed) {
      const recent = phaseLogs.slice(-needed);
      gateMet =
        gate.requiredGoodPct != null
          ? recent.every(l => l.goodPct >= gate.requiredGoodPct!)
          : true;
    }
    if (!gateMet && gate.gameGate) {
      const { gameId, targetScore, requiredSessions } = gate.gameGate;
      gateMet = passingGameRounds(sessions, gameId, targetScore) >= requiredSessions;
    }

    out[phase.id] = {
      phaseId: phase.id,
      sessions: phaseLogs.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lastSessionAt: latest ? (latest as any)._startedAt : null,
      lastGoodPct: latest ? latest.goodPct : null,
      gateMet,
    };
  }

  return out;
}

/**
 * Determine which phase the user will run today.
 *   • If gate is met AND next phase exists → advance to next phase
 *   • Otherwise → stay on current phase
 *   • Manual override (reset / repeat) handled by caller via overrideToPhaseId
 */
export function todaysPhaseId(
  program: Program,
  progress: ProgramProgress,
  overrideToPhaseId?: string
): string {
  if (overrideToPhaseId) return overrideToPhaseId;
  if (progress.nextPhaseUnlocked) {
    return program.phases[progress.currentPhaseIndex + 1].id;
  }
  return progress.currentPhaseId;
}
