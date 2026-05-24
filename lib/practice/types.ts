// =====================================================
// Golf Practice OS — Core Domain Types
// These are the single source of truth for all practice content.
// Keep them simple, well-documented, and stable.
// =====================================================

export type PracticeType = "block" | "random" | "mixed" | "game" | "planned";

export type SkillCategory =
  | "driver"
  | "fairway-woods"
  | "long-irons"
  | "mid-irons"
  | "short-irons"
  | "wedges"
  | "short-game"
  | "putting"
  | "bunker"
  | "tempo"
  | "full-swing";

/** Warm-up vs main practice — used by random sessions */
export type SessionShotPhase = "warmup" | "practice";

export interface Drill {
  id: string;
  name: string;
  category: SkillCategory;
  /** When set, SessionRunner shows phase labels and warm-up controls */
  sessionPhase?: SessionShotPhase;
  club: string;                    // "7-iron", "Driver", "56°", etc.
  distance: string;                // "150 yd", "Full", "8 ft", "30-50 yd"
  target?: string;                 // "Left flag", "Center green", "Bucket"
  shotShape?: "straight" | "draw" | "fade" | "high" | "low" | "any";
  lie?: "fairway" | "rough" | "uphill" | "sidehill" | "bunker" | "green";
  instructions?: string;           // What the golfer should focus on / do
  reps?: number;                   // Suggested reps for block use
}

/** Simplified skill focus for Practice Builder */
export type BuilderFocus = "full-swing" | "chipping" | "pitching" | "putting" | "bunker";

export type SwingLength = "full" | "three-quarter" | "half" | "random";

/** Block → random progression within one session (motor learning) */
export type BuilderPracticeMode = "block" | "random" | "transition";

/** Per-rep shape/trajectory; null entry = use session-level fixed intention */
export type ShotIntention = {
  shape: "Draw" | "Straight" | "Fade";
  trajectory: "High" | "Medium" | "Low";
};

export interface BlockResult {
  blockIndex: number;
  consistency?: number;           // 1–5 self-rating after block
  gridHits?: boolean[];           // 3×3 target zone (index 0–8)
  hits?: number;
  misses?: number;
}

export type CorrectionAnswer = "yes" | "partial" | "no";

export interface RepErrorCorrection {
  /** Ball started on intended shape / line */
  startedOnLine?: CorrectionAnswer;
  /** Flight matched intended trajectory */
  trajectoryMatch?: CorrectionAnswer;
  /** Overall — shot matched intent */
  hitIntendedShot?: CorrectionAnswer;
  /** Executed the session focus cue */
  focusCueMatch?: CorrectionAnswer;
}

export interface RepRecordSnapshot {
  repNumber: number;
  rating?: number;
  drill?: Drill;
  blockIndex?: number;
  shape?: string;
  trajectory?: string;
  errorCorrection?: RepErrorCorrection;
}

export interface SessionConfig {
  type: PracticeType;
  title: string;
  durationMinutes: number;
  focusAreas: SkillCategory[];
  drills: Drill[];                 // Ordered list for the session
  /** Random practice: leading warm-up shots before interleaved practice */
  warmupShotCount?: number;
  focusCue?: string;               // Global or per-drill override
  notes?: string;
  /** Practice Builder: structured multi-block sessions */
  builderFocus?: BuilderFocus;
  club?: string;
  clubs?: string[];
  swingLength?: SwingLength;
  ballsPerBlock?: number;
  numBlocks?: number;
  cadenceSeconds?: number;         // Shot timer between reps (15 / 30 / 45)
  practiceMode?: BuilderPracticeMode;
  /** Random shape/trajectory per rep when practiceMode is random (or transition random half) */
  perRepIntentions?: (ShotIntention | null)[];
  blockResults?: BlockResult[];
  repRecords?: RepRecordSnapshot[];
  /**
   * Huberman Random Micro-Pause Mode: after ~25 % of practice shots the app
   * forces a 10-second "Neural Replay Gap" so the motor cortex can consolidate
   * the previous rep at 20× speed before the next one.
   */
  microPauseMode?: boolean;
  /**
   * Slow Burn Mode: session-wide flag that tells the golfer to swing at 15 %
   * speed, forcing conscious mapping of every position in the motor cortex.
   */
  slowBurn?: boolean;
}

export interface PracticeSession {
  id: string;
  userId: string;
  type: PracticeType;
  title: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  ballsUsed?: number;
  overallFeel?: number;            // 1-5
  notes?: string;
  reflection?: {
    well?: string;
    improve?: string;
    energy?: number;               // 1-5
    focus?: number;
    replayDone?: boolean;
  };
  config: SessionConfig;           // Full replayable snapshot
  score?: number;                  // For games
}

// Game definition (used for the Games hub + scoring engine)
export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  whyItHelps: string;
  estimatedMinutes: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  // A game can provide its own React component for interactive scoring
  // or use a generic one driven by this config
  scoringType: "proximity" | "up-down" | "ladder" | "matrix" | "pressure" | "custom";
}
