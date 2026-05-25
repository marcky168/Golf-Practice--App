/**
 * Scenario-based bunker drills.
 *
 * Each rep presents a bunker lie, distance, and green context — the player
 * chooses the club and explosion type, like on the course.
 */
import type { BunkerPracticeType, Drill } from "./types";

export const BUNKER_TYPE_OPTIONS: {
  value: BunkerPracticeType;
  label: string;
  description: string;
}[] = [
  {
    value: "greenside",
    label: "Greenside",
    description: "Splash shots · 8–30 yd · wedges only",
  },
  {
    value: "fairway",
    label: "Fairway bunker",
    description: "Clean escapes · 110–175 yd · irons & hybrids",
  },
];

type BunkerLie = {
  label: string;
  coaching: string;
};

const GREENSIDE_LIES: BunkerLie[] = [
  {
    label: "Soft fluffy sand · ball sitting up",
    coaching: "Open the face — splash 1–2\" behind and trust the bounce",
  },
  {
    label: "Wet compact sand · plugged lie",
    coaching: "Dig in slightly — steeper angle, less bounce, more aggressive entry",
  },
  {
    label: "Fried egg · half buried",
    coaching: "Closed face, dig deep — expect a lower, running exit",
  },
  {
    label: "High lip in front · must carry",
    coaching: "Maximum loft, full face open — commit to height over distance control",
  },
  {
    label: "Downhill lie in bunker · face open",
    coaching: "Match the slope with your shoulders — ball will come out hot and low",
  },
  {
    label: "Uphill lie · steep exit required",
    coaching: "Shoulders match the slope — extra loft helps clear the lip cleanly",
  },
  {
    label: "Buried lie · pick it clean",
    coaching: "Steep, aggressive strike — don't decelerate through impact",
  },
  {
    label: "Greenside · tight pin",
    coaching: "Minimal green to work with — focus on landing spot, not the flag",
  },
  {
    label: "Greenside · back pin",
    coaching: "Extra carry required — visualise the splash point, not just the hole",
  },
  {
    label: "Steep face · ball near the lip",
    coaching: "High hands, open face — avoid catching the leading edge on the lip",
  },
];

const FAIRWAY_LIES: BunkerLie[] = [
  {
    label: "Fairway bunker · clean lie",
    coaching: "Pick the club that clears the lip with margin — clean contact beats heroics",
  },
  {
    label: "Fairway bunker · ball below feet",
    coaching: "Grip down, stay balanced — expect a pull, aim slightly right",
  },
  {
    label: "Fairway bunker · ball above feet",
    coaching: "Stand tall, choke down — expect a push, aim slightly left",
  },
  {
    label: "Fairway bunker · long carry over lip",
    coaching: "Take enough club to clear the lip comfortably — don't flirt with the edge",
  },
  {
    label: "Fairway bunker · into a headwind",
    coaching: "One more club than normal — low spin, clean strike, accept less roll",
  },
];

const GREENSIDE_DISTANCES = [
  "8 yd", "10 yd", "12 yd", "15 yd", "18 yd", "20 yd", "22 yd", "25 yd", "28 yd", "30 yd",
];

const FAIRWAY_DISTANCES = [
  "110 yd", "125 yd", "135 yd", "145 yd", "155 yd", "165 yd", "175 yd",
];

const GREEN_CONDITIONS = [
  "Pin tucked front · 3 ft of green to work with",
  "Pin front · 6 ft of green — land it short",
  "Pin centre · 12 ft of green",
  "Back pin · 20 ft of green to use",
  "Plenty of green · safe splash and release",
  "Firm green · expect extra rollout after landing",
  "Soft green · ball checks quickly",
  "Downhill to pin · use the slope after landing",
  "Uphill to pin · extra carry to reach the hole",
  "Flag tight · bunker long — miss short only",
  "Wide green · pick a conservative landing spot",
  "Two-tier green · flag on the top shelf",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isWedgeClub(name: string): boolean {
  const n = name.toLowerCase();
  return /wedge|°|\bsw\b|\blw\b|\bgw\b|\bpw\b|sand|lob/.test(n);
}

/** Clubs shown in the scenario picker — depends on greenside vs fairway session. */
export function filterClubsForBunkerScenario(
  clubs: string[],
  type: BunkerPracticeType = "greenside"
): string[] {
  if (type === "greenside") {
    const wedges = clubs.filter(c => !/putter/i.test(c) && isWedgeClub(c));
    return wedges.length > 0 ? wedges : clubs.filter(c => !/putter/i.test(c));
  }

  const fairway = clubs.filter(c => {
    const n = c.toLowerCase();
    if (/putter/.test(n)) return false;
    if (/hybrid|wood/.test(n)) return true;
    if (/\b[56789]\s*-?\s*iron/.test(n)) return true;
    return false;
  });
  return fairway.length > 0 ? fairway : clubs.filter(c => !/putter/i.test(c));
}

export function bunkerSessionTitle(type: BunkerPracticeType, detail: string): string {
  const label = type === "greenside" ? "Greenside Bunker" : "Fairway Bunker";
  return `${label} · ${detail}`;
}

export function generateBunkerScenario(id: string, type: BunkerPracticeType): Drill {
  const lie = pick(type === "fairway" ? FAIRWAY_LIES : GREENSIDE_LIES);
  const distance = pick(type === "fairway" ? FAIRWAY_DISTANCES : GREENSIDE_DISTANCES);
  const green = pick(GREEN_CONDITIONS);

  return {
    id,
    name: lie.label,
    category: "bunker",
    club: "Your choice",
    distance,
    target: green,
    instructions: lie.coaching,
    lie: "bunker",
    scenarioBased: true,
  };
}

export function generateBunkerScenarios(count: number, type: BunkerPracticeType): Drill[] {
  return Array.from({ length: count }, (_, i) =>
    generateBunkerScenario(`bunker-${type}-${Date.now()}-${i}`, type)
  );
}
