/**
 * Scenario-based short-game drills.
 *
 * Instead of prescribing a club, each drill presents the golfer with a real
 * on-course problem: lie condition, distance, and how much green they have to
 * work with. The player decides the club and shot type themselves — exactly how
 * it works on the course.
 */
import type { BuilderPracticeMode, Drill } from "./types";
import { blockUsesRandomMode } from "./intentions";

export type ChippingLieOption = {
  label: string;
  coaching: string;
};

export const CHIPPING_LIE_OPTIONS: ChippingLieOption[] = [
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

export const CHIPPING_GREEN_OPTIONS = [
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
] as const;

const DISTANCES = [
  "6 yd", "8 yd", "10 yd", "12 yd", "14 yd",
  "16 yd", "18 yd", "20 yd", "22 yd", "25 yd",
  "28 yd", "32 yd",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function findChippingLie(label: string): ChippingLieOption | undefined {
  return CHIPPING_LIE_OPTIONS.find(l => l.label === label);
}

/** Short-game club options — wedges, hybrid, 6–9 iron (not full bag). */
export function filterClubsForChippingScenario(clubs: string[]): string[] {
  const filtered = clubs.filter(c => {
    const n = c.toLowerCase();
    if (/putter/.test(n)) return false;
    if (/driver|\b\d+\s*-?\s*wood\b|fairway\s*wood/.test(n)) return false;
    if (/wedge|°|\bpw\b|\bsw\b|\blw\b|\bgw\b|sand|lob|pitching/.test(n)) return true;
    if (/hybrid/.test(n)) return true;
    if (/\b[6789]\s*-?\s*iron/.test(n)) return true;
    return false;
  });
  return filtered.length > 0
    ? filtered
    : clubs.filter(c => !/putter|driver|wood/i.test(c));
}

export function buildChippingScenario(
  id: string,
  parts: {
    lie?: ChippingLieOption;
    distance?: string;
    green?: string;
  } = {}
): Drill {
  const lie = parts.lie ?? pick(CHIPPING_LIE_OPTIONS);
  const distance = parts.distance ?? pick(DISTANCES);
  const green = parts.green ?? pick([...CHIPPING_GREEN_OPTIONS]);

  return {
    id,
    name: lie.label,
    category: "short-game",
    club: "Your choice",
    distance,
    target: green,
    instructions: lie.coaching,
    scenarioBased: true,
  };
}

export function generateChippingScenario(id: string): Drill {
  return buildChippingScenario(id);
}

export function generateChippingScenarios(count: number): Drill[] {
  return Array.from({ length: count }, (_, i) =>
    generateChippingScenario(`chip-scenario-${Date.now()}-${i}`)
  );
}

function blockScenarioForSession(
  id: string,
  blockFocus?: { lieLabel?: string; green?: string }
): Drill {
  const lie = blockFocus?.lieLabel
    ? findChippingLie(blockFocus.lieLabel) ?? pick(CHIPPING_LIE_OPTIONS)
    : pick(CHIPPING_LIE_OPTIONS);
  const green = blockFocus?.green ?? pick([...CHIPPING_GREEN_OPTIONS]);
  const distance = pick(DISTANCES);

  return buildChippingScenario(id, { lie, distance, green });
}

/**
 * Builds chipping reps respecting block / random / block→random practice mode.
 * Block: same lie + distance + green for every ball in a block.
 * Random: new scenario every rep.
 * Transition: blocked scenarios for the first half of blocks, then random reps.
 */
export function generateChippingScenariosForSession(options: {
  ballsPerBlock: number;
  numBlocks: number;
  practiceMode: BuilderPracticeMode;
  /** Fixed lie + green for block reps (optional — random if omitted) */
  blockLieLabel?: string;
  blockGreen?: string;
}): Drill[] {
  const { ballsPerBlock, numBlocks, practiceMode, blockLieLabel, blockGreen } = options;
  const totalShots = ballsPerBlock * numBlocks;
  const blockFocus =
    blockLieLabel || blockGreen
      ? { lieLabel: blockLieLabel, green: blockGreen }
      : undefined;

  if (practiceMode === "random") {
    return generateChippingScenarios(totalShots);
  }

  const drills: Drill[] = [];

  for (let b = 0; b < numBlocks; b++) {
    const isRandomBlock = blockUsesRandomMode(b, numBlocks, practiceMode);
    const blockScenario = blockScenarioForSession(`chip-block-${b}-${Date.now()}`, blockFocus);

    for (let r = 0; r < ballsPerBlock; r++) {
      if (isRandomBlock) {
        drills.push(generateChippingScenario(`chip-scenario-${Date.now()}-b${b}-r${r}`));
      } else {
        drills.push({
          ...blockScenario,
          id: `${blockScenario.id}-r${r}`,
        });
      }
    }
  }

  return drills;
}
