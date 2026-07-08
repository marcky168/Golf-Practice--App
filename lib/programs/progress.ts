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
      nextPhaseUnlocked: gateMet && program.phases.length > 1,
      lastSessionAt: null,
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

  const nextPhaseUnlocked = gateMet && currentPhaseIndex < program.phases.length - 1;

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
  };
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
