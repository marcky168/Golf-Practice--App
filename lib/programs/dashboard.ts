/**
 * Dashboard / hub helpers for program discoverability and "continue" CTAs.
 */
import { PROGRAMS } from "./registry";
import {
  computeProgramProgress,
  type AnySession,
  type ProgramProgress,
} from "./progress";
import type { Program } from "./types";
import { GAMES } from "@/lib/practice/games";

export type ProgramContinueCard = {
  program: Program;
  progress: ProgramProgress;
  phaseName: string;
  phaseNumber: string;
  href: string;
  /** Plain-English gate status for the current phase */
  gateLabel: string;
  /** 0–100 progress toward unlocking the next phase (best-effort) */
  gatePct: number;
};

/** Map practice_sessions rows into the shape progress.ts expects. */
export function sessionsForProgramProgress(
  sessions: {
    started_at: string;
    type?: string;
    score?: number | null;
    config: unknown;
  }[]
): AnySession[] {
  return sessions.map(s => ({
    started_at: s.started_at,
    type: s.type,
    score: s.score,
    config: s.config as AnySession["config"],
  }));
}

/**
 * Plain-English gate copy + a rough progress % for UI bars.
 * Prefer game-gate progress when the user has started that path;
 * otherwise show honor-system consecutive sessions.
 */
export function describeGateProgress(
  program: Program,
  progress: ProgramProgress,
  sessions: AnySession[]
): { label: string; pct: number } {
  const phase = program.phases[progress.currentPhaseIndex];
  const gate = phase.gate;
  const noun = (program.phaseNoun ?? "Phase").toLowerCase();

  if (progress.gateMet) {
    if (progress.nextPhaseUnlocked) {
      return { label: "Gate met — next phase unlocked", pct: 100 };
    }
    // Parallel modules never unlock anything — the gate is a per-module standard.
    if (progress.parallel) {
      return { label: `${phase.name} — standard met`, pct: 100 };
    }
    return { label: "Open-ended phase — keep training", pct: 100 };
  }

  // Game-gate progress (alternative path)
  if (gate.gameGate) {
    const { gameId, targetScore, requiredSessions } = gate.gameGate;
    const passing = sessions.filter(
      s =>
        s.type === "game" &&
        s.score != null &&
        s.score >= targetScore &&
        s.config?.gameId === gameId
    ).length;
    const gameName = GAMES.find(g => g.id === gameId)?.name ?? "scored game";
    if (passing > 0 || !gate.requiredConsecutiveSessions) {
      const pct = Math.min(100, Math.round((passing / requiredSessions) * 100));
      return {
        label: `${passing} of ${requiredSessions} rounds of ${gameName} at ${targetScore}+`,
        pct,
      };
    }
  }

  if (gate.requiredConsecutiveSessions) {
    const needed = gate.requiredConsecutiveSessions;
    const have = Math.min(progress.sessionsInCurrentPhase, needed);
    const pctLabel =
      gate.requiredGoodPct != null ? ` at ${gate.requiredGoodPct}%+ good` : "";
    return {
      label: `${have} of ${needed} consecutive sessions${pctLabel} in this ${noun}`,
      pct: Math.min(100, Math.round((have / needed) * 100)),
    };
  }

  return { label: "Keep logging sessions", pct: 0 };
}

/**
 * Programs the user has started (or all programs with a "start" card when none started).
 * Sorted: most recently practiced first.
 */
export function getProgramContinueCards(sessions: AnySession[]): ProgramContinueCard[] {
  const cards: ProgramContinueCard[] = PROGRAMS.map(program => {
    const progress = computeProgramProgress(program, sessions);
    const phase = program.phases[progress.currentPhaseIndex];
    const { label, pct } = describeGateProgress(program, progress, sessions);
    return {
      program,
      progress,
      phaseName: phase.name,
      phaseNumber: phase.number,
      href: `/programs/${program.id}`,
      gateLabel: label,
      gatePct: pct,
    };
  });

  // Prefer programs with activity, then by last session
  return cards.sort((a, b) => {
    const aActive = a.progress.totalProgramSessions > 0 || a.progress.gateMet ? 1 : 0;
    const bActive = b.progress.totalProgramSessions > 0 || b.progress.gateMet ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;
    const aAt = a.progress.lastSessionAt ?? "";
    const bAt = b.progress.lastSessionAt ?? "";
    return bAt.localeCompare(aAt);
  });
}

/** Primary "continue" program — one with logged sessions, else first registry program. */
export function getPrimaryProgramCard(sessions: AnySession[]): ProgramContinueCard {
  const cards = getProgramContinueCards(sessions);
  const started = cards.find(c => c.progress.totalProgramSessions > 0);
  return started ?? cards[0];
}

/** Game IDs prescribed by the user's current Break 90 (or active) phase. */
export function recommendedGameIdsForActivePrograms(sessions: AnySession[]): {
  gameId: string;
  programName: string;
  phaseName: string;
}[] {
  const out: { gameId: string; programName: string; phaseName: string }[] = [];
  const seen = new Set<string>();
  for (const card of getProgramContinueCards(sessions)) {
    if (card.progress.totalProgramSessions === 0 && !card.progress.gateMet) continue;
    const phase = card.program.phases[card.progress.currentPhaseIndex];
    for (const drill of phase.compileDrills) {
      if (drill.gameId && !seen.has(drill.gameId)) {
        seen.add(drill.gameId);
        out.push({
          gameId: drill.gameId,
          programName: card.program.name,
          phaseName: phase.name,
        });
      }
    }
  }
  return out;
}
