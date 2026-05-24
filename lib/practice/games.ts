import { GameDefinition, type GameCategory } from "./types";

export type GameFilterId = "all" | GameCategory;

export const GAME_CATEGORY_LABELS: Record<GameCategory, string> = {
  chipping: "Chipping",
  putting: "Putting",
  pitching: "Pitching",
  "full-swing": "Full swing",
  "course-sim": "Course sim",
  pressure: "Pressure",
};

export const GAME_FILTERS: { id: GameFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "chipping", label: GAME_CATEGORY_LABELS.chipping },
  { id: "putting", label: GAME_CATEGORY_LABELS.putting },
  { id: "pitching", label: GAME_CATEGORY_LABELS.pitching },
  { id: "full-swing", label: GAME_CATEGORY_LABELS["full-swing"] },
  { id: "course-sim", label: GAME_CATEGORY_LABELS["course-sim"] },
  { id: "pressure", label: GAME_CATEGORY_LABELS.pressure },
];

export function filterGamesByCategory(games: GameDefinition[], filter: GameFilterId): GameDefinition[] {
  if (filter === "all") return games;
  return games.filter((g) => g.category === filter);
}

/**
 * Games & Challenges Library
 * 
 * Each game has a pure description + scoring type.
 * The interactive UI components will live in components/practice/Game*.
 * Scoring logic can be added here as pure functions later.
 */
export const GAMES: GameDefinition[] = [
  {
    id: "10-ball-accuracy",
    name: "10-Ball Accuracy Challenge",
    description: "Pick any club + target. Hit 10 shots. Score by how close you finish to the target (bullseye = 5 pts, outer ring = 1 pt).",
    whyItHelps: "Forces you to treat every shot like it matters. Immediate feedback on dispersion.",
    estimatedMinutes: 18,
    difficulty: "intermediate",
    category: "full-swing",
    scoringType: "proximity",
  },
  {
    id: "up-and-down",
    name: "Up & Down Scramble",
    description: "6 different lies around a practice green. Chip or pitch + one putt. Goal: get up and down all 6 times.",
    whyItHelps: "The single highest-ROI skill in golf. Simulates real pressure around the greens.",
    estimatedMinutes: 25,
    difficulty: "intermediate",
    category: "chipping",
    scoringType: "up-down",
  },
  {
    id: "lag-putting-ladder",
    name: "Lag Putting Ladder",
    description: "From 8 ft, 15 ft, 25 ft, 40 ft. Three balls at each distance. Points for how close you leave the ball to the hole.",
    whyItHelps: "Distance control is 80% of good putting. This drill kills 3-putts.",
    estimatedMinutes: 20,
    difficulty: "beginner",
    category: "putting",
    scoringType: "ladder",
  },
  {
    id: "9-shot-matrix",
    name: "9-Shot Flight Matrix",
    description: "7-iron only. Hit every combination of High / Mid / Low × Draw / Straight / Fade. 9 total shots. Self-score success.",
    whyItHelps: "Teaches you true ball flight control — the difference between good players and great ones.",
    estimatedMinutes: 22,
    difficulty: "advanced",
    category: "full-swing",
    scoringType: "matrix",
  },
  {
    id: "pressure-5",
    name: "Pressure 5-in-a-Row",
    description: "Pick a target 100-130 yards. You must hit 5 perfect shots in a row to the target. Miss = restart the streak.",
    whyItHelps: "Introduces real pressure and consequence. Excellent for competitive players.",
    estimatedMinutes: 15,
    difficulty: "intermediate",
    category: "pressure",
    scoringType: "pressure",
  },
  {
    id: "random-3-hole",
    name: "Random 3-Hole Challenge",
    description: "Play 3 realistic holes on the range. Each hole has a tee shot + approach (sometimes a pitch or chip). No putting — just proper golf shots.",
    whyItHelps: "The ultimate transfer drill. Forces decision making and pre-shot routine under variety in a realistic format.",
    estimatedMinutes: 20,
    difficulty: "intermediate",
    category: "course-sim",
    scoringType: "custom",
  },
  {
    id: "arena-3-hole",
    name: "3-Hole Arena Test",
    description: "Par 4, Par 3, Par 5 — six shots with real hole context. Hit target = ✓. Miss = log exactly what went wrong. No feel ratings. Honest binary scoring.",
    whyItHelps: "Range skills fail to transfer because practice has no context. Simulating real hole sequences — driver, approach, pitch — creates the decision pressure that builds course-ready skill. Recording the error activates the neuroplasticity signal needed for real adaptation.",
    estimatedMinutes: 15,
    difficulty: "intermediate",
    category: "course-sim",
    scoringType: "custom",
  },
  {
    id: "chip-ladder",
    name: "Chip Ladder",
    description: "10, 15, 20, and 25 yards to the pin. Three chips at each distance. Score by how close you finish — same ladder logic as lag putting, but with your wedge.",
    whyItHelps: "Distance control is the #1 short-game skill. Ladder format forces you to recalibrate carry and rollout at every yardage — not just muscle-memory one distance.",
    estimatedMinutes: 18,
    difficulty: "beginner",
    category: "chipping",
    scoringType: "ladder",
  },
  {
    id: "landing-zone-8",
    name: "Landing Zone 8",
    description: "Pick a wedge and a landing spot. Hit 8 chips — score by whether you hit your spot and how close the ball finishes to the hole.",
    whyItHelps: "Tour players think landing spot first, hole second. This game trains the exact decision loop that separates crisp chips from hopeful flips.",
    estimatedMinutes: 15,
    difficulty: "intermediate",
    category: "chipping",
    scoringType: "proximity",
  },
  {
    id: "bump-and-run-blitz",
    name: "Bump-and-Run Blitz",
    description: "Six bump-and-run lies from fringe to fairway (8–25 yd). One goal: finish inside 8 feet. No putting — pure low-runner control.",
    whyItHelps: "The safest miss around the green is on the ground. This builds confidence when you have room to run it and tight pins make loft risky.",
    estimatedMinutes: 12,
    difficulty: "beginner",
    category: "chipping",
    scoringType: "up-down",
  },
  {
    id: "makeable-putt-ladder",
    name: "Makeable Putt Ladder",
    description: "One putt each at 4, 6, 8, 10, and 12 feet. Simple make/miss — builds confidence on the putts you must convert.",
    whyItHelps: "Inside 12 feet is where strokes are won and lost. Ladder format adds gentle pressure as distances grow without overwhelming volume.",
    estimatedMinutes: 10,
    difficulty: "beginner",
    category: "putting",
    scoringType: "up-down",
  },
  {
    id: "clock-drill",
    name: "Clock Drill",
    description: "Four putts from 3 feet — 12, 3, 6, and 9 o'clock around the hole. Hole all four to complete the circuit.",
    whyItHelps: "Breaks short-putt autopilot. Different break on every rep trains read + start line — the classic tour warm-up for a reason.",
    estimatedMinutes: 8,
    difficulty: "beginner",
    category: "putting",
    scoringType: "up-down",
  },
  {
    id: "lag-to-tap-in",
    name: "Lag to Tap-In",
    description: "Six long putts from 25–50 feet. Score by leave quality — goal is a stress-free second putt, not holing out.",
    whyItHelps: "Three-putts come from poor speed, not poor line. This isolates distance control on the putts that actually matter for score.",
    estimatedMinutes: 15,
    difficulty: "intermediate",
    category: "putting",
    scoringType: "proximity",
  },
  {
    id: "pitch-ladder",
    name: "Pitch Ladder",
    description: "40, 50, 60, and 70 yards to the pin. Three pitches at each distance — score every finish like a lag putt.",
    whyItHelps: "Partial wedge yardages are the gap between full swings and chips. Ladder format builds a reliable stock pitch at every in-between number.",
    estimatedMinutes: 20,
    difficulty: "intermediate",
    category: "pitching",
    scoringType: "ladder",
  },
  {
    id: "pin-high-8",
    name: "Pin High 8",
    description: "Eight pitches from 35–75 yards to varied pins. Score by pin-high proximity — long and short misses cost you.",
    whyItHelps: "Amateurs miss short; good players miss long. Pin-high discipline is the fastest way to stick more approach pitches close.",
    estimatedMinutes: 18,
    difficulty: "intermediate",
    category: "pitching",
    scoringType: "proximity",
  },
  {
    id: "wedge-window-6",
    name: "Wedge Window 6",
    description: "Six pitches — high, mid, and low flight at 50 and 65 yards. Hit your window: on the green, pin-high.",
    whyItHelps: "Course management demands different trajectories to the same yardage. This builds a 6-shot flight menu you can trust under pressure.",
    estimatedMinutes: 16,
    difficulty: "advanced",
    category: "pitching",
    scoringType: "matrix",
  },
];

/**
 * Scoring helpers for the interactive games.
 * These are pure functions so the UI components stay clean.
 */

// 10-Ball Accuracy
// Score per shot: 5 = bullseye, 4 = inner ring, 3 = outer ring, 1 = on green but outside, 0 = miss
export function calculate10BallScore(scores: number[]): {
  total: number;
  max: number;
  percentage: number;
  breakdown: { 5: number; 4: number; 3: number; 1: number; 0: number };
} {
  const total = scores.reduce((sum, s) => sum + s, 0);
  const max = scores.length * 5;
  const percentage = Math.round((total / max) * 100);

  const breakdown = { 5: 0, 4: 0, 3: 0, 1: 0, 0: 0 };
  scores.forEach((s) => {
    if (s === 5) breakdown[5]++;
    else if (s === 4) breakdown[4]++;
    else if (s === 3) breakdown[3]++;
    else if (s === 1) breakdown[1]++;
    else breakdown[0]++;
  });

  return { total, max, percentage, breakdown };
}

// Lag Putting Ladder
// For each distance (3 balls), user gives score per ball: 5=inside 3ft, 3=inside 6ft, 1=inside 10ft, 0=outside
export function calculateLagLadderScore(results: number[][]): {
  total: number;
  max: number;
  byDistance: { distance: string; score: number }[];
} {
  const distances = ["8 ft", "15 ft", "25 ft", "40 ft"];
  let total = 0;
  const byDistance: { distance: string; score: number }[] = [];

  results.forEach((balls, i) => {
    const distScore = balls.reduce((a, b) => a + b, 0);
    total += distScore;
    byDistance.push({ distance: distances[i], score: distScore });
  });

  return {
    total,
    max: 4 * 3 * 5, // 4 distances × 3 balls × 5 max
    byDistance,
  };
}

// Chip Ladder — same scoring bands, yardage distances
export const CHIP_LADDER_DISTANCES = ["10 yd", "15 yd", "20 yd", "25 yd"] as const;

export function calculateChipLadderScore(results: number[][]): {
  total: number;
  max: number;
  byDistance: { distance: string; score: number }[];
} {
  let total = 0;
  const byDistance: { distance: string; score: number }[] = [];

  results.forEach((balls, i) => {
    const distScore = balls.reduce((a, b) => a + b, 0);
    total += distScore;
    byDistance.push({ distance: CHIP_LADDER_DISTANCES[i] ?? `${i}`, score: distScore });
  });

  return {
    total,
    max: CHIP_LADDER_DISTANCES.length * 3 * 5,
    byDistance,
  };
}

// Landing Zone 8 — landing spot + proximity finish
export function calculateLandingZoneScore(scores: number[]): {
  total: number;
  max: number;
  percentage: number;
  breakdown: { 5: number; 4: number; 3: number; 1: number; 0: number };
} {
  const total = scores.reduce((sum, s) => sum + s, 0);
  const max = scores.length * 5;
  const percentage = max > 0 ? Math.round((total / max) * 100) : 0;

  const breakdown = { 5: 0, 4: 0, 3: 0, 1: 0, 0: 0 };
  scores.forEach((s) => {
    if (s === 5) breakdown[5]++;
    else if (s === 4) breakdown[4]++;
    else if (s === 3) breakdown[3]++;
    else if (s === 1) breakdown[1]++;
    else breakdown[0]++;
  });

  return { total, max, percentage, breakdown };
}

// Bump-and-Run Blitz — count inside target zone
export function calculateBumpAndRunScore(hits: boolean[]): {
  made: number;
  total: number;
  percentage: number;
} {
  const made = hits.filter(Boolean).length;
  return {
    made,
    total: hits.length,
    percentage: hits.length > 0 ? Math.round((made / hits.length) * 100) : 0,
  };
}

export function calculateBinaryCircuitScore(hits: boolean[]): {
  made: number;
  total: number;
  percentage: number;
} {
  return calculateBumpAndRunScore(hits);
}

export const MAKEABLE_PUTT_DISTANCES = ["4 ft", "6 ft", "8 ft", "10 ft", "12 ft"] as const;

export const CLOCK_POSITIONS = [
  { label: "12 o'clock", detail: "3 ft · straight uphill or flat" },
  { label: "3 o'clock", detail: "3 ft · right-to-left break" },
  { label: "6 o'clock", detail: "3 ft · straight downhill" },
  { label: "9 o'clock", detail: "3 ft · left-to-right break" },
] as const;

export const LAG_TO_TAP_IN_DISTANCES = ["25 ft", "30 ft", "35 ft", "40 ft", "45 ft", "50 ft"] as const;

export function calculateLagToTapInScore(scores: number[]): {
  total: number;
  max: number;
  percentage: number;
} {
  const total = scores.reduce((sum, s) => sum + s, 0);
  const max = scores.length * 5;
  return {
    total,
    max,
    percentage: max > 0 ? Math.round((total / max) * 100) : 0,
  };
}

export const PITCH_LADDER_DISTANCES = ["40 yd", "50 yd", "60 yd", "70 yd"] as const;

export function calculatePitchLadderScore(
  results: number[][],
  customDistances?: string[]
): {
  total: number;
  max: number;
  byDistance: { distance: string; score: number }[];
} {
  const labels = customDistances ?? [...PITCH_LADDER_DISTANCES];
  let total = 0;
  const byDistance: { distance: string; score: number }[] = [];

  results.forEach((balls, i) => {
    const distScore = balls.reduce((a, b) => a + b, 0);
    total += distScore;
    byDistance.push({ distance: labels[i] ?? `${i}`, score: distScore });
  });

  return {
    total,
    max: labels.length * 3 * 5,
    byDistance,
  };
}

export const PIN_HIGH_YARDAGES = [45, 55, 65, 50, 70, 40, 60, 55] as const;

export function calculatePinHighScore(scores: number[]): {
  total: number;
  max: number;
  percentage: number;
} {
  return calculateLandingZoneScore(scores);
}

export const WEDGE_WINDOW_SHOTS = [
  { yards: 50, trajectory: "High", detail: "Soft landing — stop it fast" },
  { yards: 50, trajectory: "Mid", detail: "Standard stock pitch" },
  { yards: 50, trajectory: "Low", detail: "Run it out to the pin" },
  { yards: 65, trajectory: "High", detail: "Carry trouble, hold green" },
  { yards: 65, trajectory: "Mid", detail: "Stock 3/4 wedge" },
  { yards: 65, trajectory: "Low", detail: "Bump-and-check release" },
] as const;

export function calculateWedgeWindowScore(hits: boolean[]): {
  made: number;
  total: number;
  percentage: number;
} {
  return calculateBumpAndRunScore(hits);
}

