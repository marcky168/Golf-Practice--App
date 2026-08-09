import type {
  BlockTechData,
  EquipmentDevice,
  EquipmentSelection,
  TechMetricKey,
  TechTargets,
} from "@/lib/practice/equipment";

/**
 * Programs — structured multi-phase training plans (TPI-style).
 *
 * Each program has phases. Each phase has a cue card, drills, a consolidate
 * routine, and a gate that must be met before the next phase unlocks.
 *
 * Designed so new programs are just new data files in this directory —
 * no UI changes needed to add a 2nd, 3rd, or 10th program.
 */

/** Compress: one cue + one feel. Reduce the lesson to a card you could hold. */
export interface CueCard {
  cue: string;   // e.g. "Tilt and tall."
  feel: string;  // e.g. "Right shoulder lower, hands hang under chin."
}

/** Per-drill guidance for one device, e.g. "remove the Plane Perfector here". */
export interface DrillEquipmentNote {
  device: EquipmentDevice;
  note: string;
}

export interface ProgramDrill {
  id: string;
  name: string;
  description: string;
  /** Suggested rep count (e.g. 50). Optional — some drills are timed instead */
  reps?: number;
  /** Time-bound drills, e.g. "3 min" */
  duration?: string;
  /** When set, the metronome panel shows with this BPM pre-loaded */
  metronomeBPM?: number;
  /** Marks the deliberate-error contrast drill in a phase */
  hasDeliberateError?: boolean;
  /** Marks a video-recording reminder (no capture, just a checkbox) */
  videoCheck?: boolean;
  /** Marks "random insert" drills that interleave clubs */
  randomInsert?: boolean;
  /** Links the drill to a scored game — renders a "Play scored game" link to /practice/games/<gameId> */
  gameId?: string;
  /**
   * Restricts the drill to one compile block. Unset = shown in both blocks,
   * which is the original behaviour every existing program relies on.
   */
  block?: 1 | 2;
  /**
   * Device-specific instructions for this drill. Only notes for devices the
   * user switched on are rendered.
   */
  equipmentNotes?: DrillEquipmentNote[];
}

/** How strongly a module leans on one device. */
export type EquipmentUsage = "required" | "recommended" | "optional" | "not-needed";

/** A module's stance on one device — shown on the equipment setup screen. */
export interface PhaseEquipmentPlan {
  device: EquipmentDevice;
  usage: EquipmentUsage;
  /** What this device is for in this specific module */
  role: string;
}

/** Gate criteria — strict: next phase locked until met. Honor system on the % */
export interface PhaseGate {
  description: string;
  /** % of "good" shots required across the gate window */
  requiredGoodPct?: number;
  /** Number of consecutive sessions meeting requiredGoodPct */
  requiredConsecutiveSessions?: number;
  /** True if user must self-confirm video review meets criteria */
  requiresVideoConfirmation?: boolean;
  /**
   * Optional score-based path to satisfy this gate from saved scored-game rounds.
   * Acts as an ALTERNATIVE to the honor-system goodPct gate (either satisfies it),
   * so real game scores can advance the phase without ever blocking the manual path.
   */
  gameGate?: {
    /** Which scored game's rounds count toward this gate */
    gameId: string;
    /** Minimum raw score for a round to count as passing */
    targetScore: number;
    /** How many passing rounds are needed */
    requiredSessions: number;
  };
}

export interface PhaseConsolidate {
  idleRestMinutes: number;        // e.g. 5–10
  verbalRecapTemplate: string;    // "Today I worked on X. The feel was Y. Tomorrow I'll Z."
  preSleepVisualization: boolean; // reminder to do 2-min visualisation pre-sleep
}

export interface ProgramPhase {
  /** Stable identifier — used for storage and routing */
  id: string;
  /** Display label, e.g. "1", "1.5", "2" */
  number: string;
  name: string;
  skillFocus: string;
  /** Sessions expected before gate is reached */
  estimatedSessions: { min: number; max: number };
  cueCard: CueCard;
  compileDrills: ProgramDrill[];
  consolidate: PhaseConsolidate;
  gate: PhaseGate;
  /** Optional notes shown on the phase detail page */
  notes?: string[];
  /** Overrides the program-level warm-up for this phase (falls back when unset) */
  warmup?: ProgramWarmup;
  /** Which devices this module uses and what each one is for */
  equipment?: PhaseEquipmentPlan[];
  /**
   * Metrics this module tracks per block. The entry form renders only these,
   * and only for devices that are currently switched on.
   */
  techMetrics?: TechMetricKey[];
  /** Acceptance windows for this module's metrics (merged over the defaults) */
  techTargets?: TechTargets;
  /** Estimated module length, e.g. "25–35 min" */
  duration?: string;
}

export interface WarmupBlock {
  duration: string;
  description: string;
}

export interface ProgramWarmup {
  totalDuration: string; // "8–10 min"
  blocks: WarmupBlock[];
}

export interface ScheduleDay {
  day: string;     // "Mon"
  activity: string; // "Full session (current phase)"
}

export interface DefineGoodShot {
  /** Bullet points the user reads before the session */
  criteria: string[];
  /** How the 3-of-3 → score mapping works */
  scoring: string;
}

export interface Program {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  estimatedWeeks: { min: number; max: number };
  warmup: ProgramWarmup;
  phases: ProgramPhase[];
  weeklySchedule: ScheduleDay[];
  defineGoodShot: DefineGoodShot;
  /**
   * When true the phases are parallel modules, not a sequential ladder:
   * nothing is ever locked and the user picks which one to run today.
   * Gates still evaluate per module as a progress signal.
   */
  parallelPhases?: boolean;
  /** Label for a phase in this program's UI — "Phase" unless overridden */
  phaseNoun?: string;
}

// ── Session-level types ──────────────────────────────────────────────────────

/** Sub-steps inside a single program session. Mirrors the session template. */
export type ProgramSessionStep =
  | "intro"           // welcome, show cue card, pre-session visualisation
  | "equipment"       // pick which training aids are in play today
  | "warmup"          // mobility + movement prep + dynamic swings
  | "compile-1"       // first compile block (20 min)
  | "micro-rest"      // 3 min eyes closed
  | "compile-2"       // second compile block (15–20 min)
  | "consolidate"     // 5–10 min idle rest
  | "recap"           // verbal recap out loud
  | "tracking";       // tracking sheet + save

/** What gets persisted per session, embedded in SessionConfig.programLog */
export interface ProgramSessionLog {
  programId: string;
  phaseId: string;
  sessionInPhase: number;
  goodShots: number;
  totalShots: number;
  goodPct: number;
  bestFeel?: string;
  oneThingNext?: string;
  checks: {
    warmupDone: boolean;
    cueCardRead: boolean;
    preSessionVisualization: boolean;
    idleRestDone: boolean;
    verbalRecapDone: boolean;
    preSleepVisualizationPlanned: boolean;
  };
  /**
   * True when the session was run via a ?phase= override (practice / testing).
   * These logs are stored but excluded from phase-progression logic so revisiting
   * an earlier phase can never regress the user's real position.
   */
  practiceMode?: boolean;
  /** Which training aids were switched on for this session */
  equipment?: EquipmentSelection;
  /** Per-compile-block objective data, when any device was active */
  blockTech?: BlockTechData[];
  /** Share of objective checks that landed on target, 0–100 */
  techOnTargetPct?: number;
}
