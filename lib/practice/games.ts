import { GameDefinition } from "./types";

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
    scoringType: "proximity",
  },
  {
    id: "up-and-down",
    name: "Up & Down Scramble",
    description: "6 different lies around a practice green. Chip or pitch + one putt. Goal: get up and down all 6 times.",
    whyItHelps: "The single highest-ROI skill in golf. Simulates real pressure around the greens.",
    estimatedMinutes: 25,
    difficulty: "intermediate",
    scoringType: "up-down",
  },
  {
    id: "lag-putting-ladder",
    name: "Lag Putting Ladder",
    description: "From 8 ft, 15 ft, 25 ft, 40 ft. Three balls at each distance. Points for how close you leave the ball to the hole.",
    whyItHelps: "Distance control is 80% of good putting. This drill kills 3-putts.",
    estimatedMinutes: 20,
    difficulty: "beginner",
    scoringType: "ladder",
  },
  {
    id: "9-shot-matrix",
    name: "9-Shot Flight Matrix",
    description: "7-iron only. Hit every combination of High / Mid / Low × Draw / Straight / Fade. 9 total shots. Self-score success.",
    whyItHelps: "Teaches you true ball flight control — the difference between good players and great ones.",
    estimatedMinutes: 22,
    difficulty: "advanced",
    scoringType: "matrix",
  },
  {
    id: "pressure-5",
    name: "Pressure 5-in-a-Row",
    description: "Pick a target 100-130 yards. You must hit 5 perfect shots in a row to the target. Miss = restart the streak.",
    whyItHelps: "Introduces real pressure and consequence. Excellent for competitive players.",
    estimatedMinutes: 15,
    difficulty: "intermediate",
    scoringType: "pressure",
  },
  {
    id: "random-3-hole",
    name: "Random 3-Hole Challenge",
    description: "Play 3 realistic holes on the range. Each hole has a tee shot + approach (sometimes a pitch or chip). No putting — just proper golf shots.",
    whyItHelps: "The ultimate transfer drill. Forces decision making and pre-shot routine under variety in a realistic format.",
    estimatedMinutes: 20,
    difficulty: "intermediate",
    scoringType: "custom",
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

