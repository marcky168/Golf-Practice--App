import type { Drill } from "./types";

/**
 * Putting scenarios — distance + break combinations so block & random putting
 * actually trains the things that miss on the course (speed + read), not just
 * the same 8-ft straight putt 15 times.
 */

export type PuttingDistanceValue = 3 | 6 | 10 | 15 | 25 | 40;
export type PuttingBreakValue =
  | "straight"
  | "slight-rl"
  | "slight-lr"
  | "strong-rl"
  | "strong-lr"
  | "uphill"
  | "downhill"
  | "double";

export type PuttingDistance = {
  value: PuttingDistanceValue;
  label: string;
  /** Target / acceptable-result hint */
  hint: string;
  /** Brief "why this distance matters" copy */
  why: string;
};

export type PuttingBreak = {
  value: PuttingBreakValue;
  label: string;
  /** Read + stroke cue */
  hint: string;
};

export const PUTTING_DISTANCES: PuttingDistance[] = [
  { value: 3,  label: "3 ft",  hint: "Dead center",          why: "Knee-knockers — confidence reps" },
  { value: 6,  label: "6 ft",  hint: "Dead center",          why: "The make-or-miss zone for scoring" },
  { value: 10, label: "10 ft", hint: "Center of cup",        why: "Birdie range on most approaches" },
  { value: 15, label: "15 ft", hint: "Inside 2 ft leave",    why: "Speed + line both matter equally" },
  { value: 25, label: "25 ft", hint: "Inside 3 ft circle",   why: "Lag — 3-putt avoidance" },
  { value: 40, label: "40 ft", hint: "Inside 4 ft circle",   why: "Pure speed — never short, never racing" },
];

export const PUTTING_BREAKS: PuttingBreak[] = [
  { value: "straight",  label: "Straight",        hint: "Flat — pure speed and start-line test" },
  { value: "slight-rl", label: "Slight R → L",    hint: "Small left-edge read · firm-side miss" },
  { value: "slight-lr", label: "Slight L → R",    hint: "Small right-edge read · firm-side miss" },
  { value: "strong-rl", label: "Strong R → L",    hint: "Outside-the-cup left · trust the apex" },
  { value: "strong-lr", label: "Strong L → R",    hint: "Outside-the-cup right · trust the apex" },
  { value: "uphill",    label: "Uphill",          hint: "Firmer stroke — die past the cup" },
  { value: "downhill",  label: "Downhill",        hint: "Softer touch — high side every time" },
  { value: "double",    label: "Double-breaker",  hint: "Reads both ways — commit to the high line" },
];

export function findPuttingDistance(value: PuttingDistanceValue): PuttingDistance {
  return PUTTING_DISTANCES.find(d => d.value === value) ?? PUTTING_DISTANCES[2];
}

export function findPuttingBreak(value: PuttingBreakValue): PuttingBreak {
  return PUTTING_BREAKS.find(b => b.value === value) ?? PUTTING_BREAKS[0];
}

function scenarioDrillId(prefix: string, i: number): string {
  return `${prefix}-${i}-${Math.random().toString(36).slice(2, 7)}`;
}

function scenarioDrill(
  id: string,
  distance: PuttingDistance,
  brk: PuttingBreak,
  putter: string
): Drill {
  return {
    id,
    name: `${distance.label} · ${brk.label}`,
    category: "putting",
    club: putter,
    distance: distance.label,
    target: distance.hint,
    instructions: `${brk.hint} · ${distance.why}`,
    shotShape: "any",
    sessionPhase: "practice",
    // Scenario flag routes the rep through the Made/Missed outcome picker in SessionRunner.
    scenarioBased: true,
  };
}

/** Best make-streak across the rep order at this distance (resets on any miss). */
export function bestStreakAtDistance(
  reps: Array<{ drill?: { distance?: string; category?: string }; scenarioOutcome?: string }>,
  distanceLabel: string
): number {
  let best = 0;
  let current = 0;
  for (const r of reps) {
    if (r.drill?.category !== "putting") continue;
    if (r.drill?.distance !== distanceLabel) continue;
    if (r.scenarioOutcome === "made") {
      current++;
      if (current > best) best = current;
    } else if (r.scenarioOutcome === "missed") {
      current = 0;
    }
  }
  return best;
}

/** Number of putts attempted at a distance in a rep list. */
export function attemptsAtDistance(
  reps: Array<{ drill?: { distance?: string; category?: string }; scenarioOutcome?: string }>,
  distanceLabel: string
): number {
  return reps.filter(
    r => r.drill?.category === "putting" && r.drill?.distance === distanceLabel && r.scenarioOutcome
  ).length;
}

/** Build N identical scenario drills — same distance + same break, every rep. */
export function generateBlockPuttingScenarios(opts: {
  count: number;
  putter: string;
  distance: PuttingDistanceValue;
  break_: PuttingBreakValue;
}): Drill[] {
  const distance = findPuttingDistance(opts.distance);
  const brk = findPuttingBreak(opts.break_);
  return Array.from({ length: opts.count }, (_, i) =>
    scenarioDrill(scenarioDrillId("putt-block", i), distance, brk, opts.putter)
  );
}

/** Random putting — varied distance + break every shot, avoiding back-to-back duplicates. */
export function generateRandomPuttingScenarios(opts: {
  count: number;
  putter: string;
}): Drill[] {
  const drills: Drill[] = [];
  let lastKey = "";

  for (let i = 0; i < opts.count; i++) {
    let distance: PuttingDistance;
    let brk: PuttingBreak;
    let attempts = 0;
    do {
      distance = PUTTING_DISTANCES[Math.floor(Math.random() * PUTTING_DISTANCES.length)];
      brk = PUTTING_BREAKS[Math.floor(Math.random() * PUTTING_BREAKS.length)];
      attempts++;
    } while (`${distance.value}-${brk.value}` === lastKey && attempts < 5);
    lastKey = `${distance.value}-${brk.value}`;
    drills.push(scenarioDrill(scenarioDrillId("putt-rand", i), distance, brk, opts.putter));
  }

  return drills;
}

/** Title for the session config — short, scannable in history. */
export function puttingSessionTitle(opts: {
  mode: "block" | "random";
  count: number;
  distance?: PuttingDistanceValue;
  break_?: PuttingBreakValue;
}): string {
  if (opts.mode === "random") return `Random Putting · ${opts.count} shots`;
  const d = opts.distance != null ? findPuttingDistance(opts.distance) : null;
  const b = opts.break_ != null ? findPuttingBreak(opts.break_) : null;
  if (d && b) return `Putting · ${d.label} ${b.label} — ${opts.count} reps`;
  return `Putting · ${opts.count} reps`;
}
