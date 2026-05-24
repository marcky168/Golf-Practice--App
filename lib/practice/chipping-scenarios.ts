/**
 * Scenario-based short-game drills.
 *
 * Instead of prescribing a club, each drill presents the golfer with a real
 * on-course problem: lie condition, distance, and how much green they have to
 * work with. The player decides the club and shot type themselves — exactly how
 * it works on the course.
 */
import type { Drill } from "./types";

// ── Lie conditions ────────────────────────────────────────────────────────────

type Lie = {
  label: string;      // Shown as the main scenario heading
  coaching: string;   // One coaching observation about the lie — not a prescription
};

const LIES: Lie[] = [
  {
    label: "Tight lie · firm turf",
    coaching: "Leading edge must be precise — no margin for a heavy strike",
  },
  {
    label: "Fluffy rough · ball sitting up",
    coaching: "Expect a flyer — land it shorter than usual, the ball will run",
  },
  {
    label: "Rough · ball sitting down",
    coaching: "Steep angle of attack, shaft forward — don't try to scoop it",
  },
  {
    label: "Downhill slope · into the green",
    coaching: "Ball releases more on landing — visualise the full bounce and roll",
  },
  {
    label: "Uphill slope · green above you",
    coaching: "Ball checks up quicker — you can be more aggressive with pace",
  },
  {
    label: "Sidehill · ball above feet",
    coaching: "Natural pull — compensate by aiming slightly right of target",
  },
  {
    label: "Sidehill · ball below feet",
    coaching: "Natural push — compensate by aiming slightly left of target",
  },
  {
    label: "Fringe / collar",
    coaching: "Is putting or a hybrid chip better here? Only use a lofted club if it's clearly superior",
  },
  {
    label: "Pan grass · links-style",
    coaching: "Very tight — de-loft and pinch it cleanly with a firm lead wrist",
  },
  {
    label: "Divot",
    coaching: "More loft, steeper descent — don't try to help it up",
  },
  {
    label: "Semi-rough · ball half-buried",
    coaching: "Open the face slightly to get the leading edge under the ball",
  },
  {
    label: "Hardpan / cart path edge",
    coaching: "Blade or low bounce wedge — no bounce allowed, stay steep",
  },
];

// ── Distances ─────────────────────────────────────────────────────────────────

const DISTANCES = [
  "6 yd", "8 yd", "10 yd", "12 yd", "14 yd",
  "16 yd", "18 yd", "20 yd", "22 yd", "25 yd",
  "28 yd", "32 yd",
];

// ── Green conditions ──────────────────────────────────────────────────────────

const GREEN_CONDITIONS = [
  "2 ft of green before the hole",
  "4 ft of green before the hole — very tight",
  "8 ft of green · flag front",
  "12 ft of green · flag centre",
  "20 ft of green · flag back",
  "Plenty of green — bump and run is an option",
  "Flag front · green slopes away from you",
  "Flag back · slope feeds toward the pin",
  "Two-tier green · flag on the top level",
  "Flag tucked, bunker long — miss short",
];

// ── Generator ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateChippingScenario(id: string): Drill {
  const lie      = pick(LIES);
  const distance = pick(DISTANCES);
  const green    = pick(GREEN_CONDITIONS);

  return {
    id,
    name:          lie.label,
    category:      "short-game",
    club:          "Your choice",
    distance,
    target:        green,
    instructions:  lie.coaching,
    scenarioBased: true,
  };
}

export function generateChippingScenarios(count: number): Drill[] {
  return Array.from({ length: count }, (_, i) =>
    generateChippingScenario(`chip-scenario-${Date.now()}-${i}`)
  );
}
