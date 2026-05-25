import { createBuilderSessionConfig } from "./builder";
import { focusLabelForPreset, pickClubsForBlockDrillPreset } from "./block-drill-clubs";
import { filterClubsForBunkerScenario } from "./bunker-scenarios";
import type { BagEntry } from "./bag";
import type { BuilderFocus, BuilderPracticeMode, BunkerPracticeType, SessionConfig, SwingLength } from "./types";

export type DrillPresetAvailability = {
  available: boolean;
  matchedClubs: string[];
  /** Human-readable focus requirement when no bag clubs fit */
  focusLabel: string;
};

export function presetNeedsIntention(focus: BuilderFocus): boolean {
  return focus !== "putting" && focus !== "bunker";
}

export interface BlockDrillPreset {
  id: string;
  name: string;
  whyItHelps: string;
  focus: BuilderFocus;
  /** Preference only — session clubs always come from the profile bag */
  club: string;
  clubs?: string[];
  swingLength?: SwingLength;
  ballsPerBlock: number;
  numBlocks: number;
  cadenceSeconds: number;
  practiceMode: BuilderPracticeMode;
  focusCue: string;
  target?: string;
  bunkerType?: BunkerPracticeType;
  chippingBlockLie?: string;
  chippingBlockGreen?: string;
}

export const BLOCK_DRILL_LIBRARY: BlockDrillPreset[] = [
  {
    id: "driver-tempo-50",
    name: "50-Ball Driver Block — Tempo",
    whyItHelps: "Repeated full swings with enforced cadence groove a consistent pre-shot routine and smooth tempo under fatigue.",
    focus: "full-swing",
    club: "Driver",
    ballsPerBlock: 10,
    numBlocks: 5,
    cadenceSeconds: 30,
    practiceMode: "block",
    focusCue: "Smooth tempo — finish balanced",
    target: "Center of fairway",
  },
  {
    id: "7iron-pure-30",
    name: "30-Ball 7-Iron — Pure Strike",
    whyItHelps: "Block reps on one club build compression feel; the shot timer keeps you deliberate instead of rapid-fire.",
    focus: "full-swing",
    club: "7-Iron",
    ballsPerBlock: 10,
    numBlocks: 3,
    cadenceSeconds: 30,
    practiceMode: "block",
    focusCue: "Divot after the ball — compress",
    target: "Center flag",
  },
  {
    id: "wedge-distance-40",
    name: "40-Ball Wedge — Distance Ladder",
    whyItHelps: "Random shots within blocks force you to recalibrate yardage — bridges block feel to on-course variability.",
    focus: "full-swing",
    club: "56°",
    ballsPerBlock: 10,
    numBlocks: 4,
    cadenceSeconds: 45,
    practiceMode: "random",
    focusCue: "Pick yardage before every swing",
  },
  {
    id: "chip-landing-30",
    name: "30-Ball Chip — Landing Spot",
    whyItHelps: "Tight block focus on one landing zone builds reliable short-game contact before you add lie variability.",
    focus: "chipping",
    club: "PW",
    chippingBlockLie: "Tight lie · firm turf",
    chippingBlockGreen: "12 ft of green · flag centre",
    ballsPerBlock: 10,
    numBlocks: 3,
    cadenceSeconds: 30,
    practiceMode: "block",
    focusCue: "Same landing spot every rep",
    target: "3 ft circle on green",
  },
  {
    id: "pitch-half-three-quarter-40",
    name: "40-Ball Pitch — 1/2 & 3/4 Ladder",
    whyItHelps: "Partial wedges with enforced cadence train distance control — the core of scoring inside 100 yards.",
    focus: "pitching",
    club: "56°",
    swingLength: "random",
    ballsPerBlock: 10,
    numBlocks: 4,
    cadenceSeconds: 30,
    practiceMode: "transition",
    focusCue: "Pick yardage before every swing",
    target: "Center flag",
  },
  {
    id: "pitch-multi-club-30",
    name: "30-Ball Pitch — Multi-Club Random",
    whyItHelps: "Rotating wedges with mixed swing lengths mimics on-course decisions better than one-club blocks.",
    focus: "pitching",
    club: "GW",
    ballsPerBlock: 10,
    numBlocks: 3,
    cadenceSeconds: 45,
    practiceMode: "random",
    focusCue: "Distance first — trust the length",
  },
  {
    id: "putt-pressure-36",
    name: "36-Ball Putting — 4 ft Pressure",
    whyItHelps: "High-rep short putts with cadence simulate tournament pace; block completion feedback tracks make-rate trends.",
    focus: "putting",
    club: "Putter",
    ballsPerBlock: 12,
    numBlocks: 3,
    cadenceSeconds: 15,
    practiceMode: "block",
    focusCue: "Accelerate through — see it go in",
    target: "Dead center",
  },
  {
    id: "bunker-greenside-24",
    name: "24-Ball Greenside Bunker",
    whyItHelps: "Random greenside lies with rest between shots — you pick the wedge for each splash, like on the course.",
    focus: "bunker",
    bunkerType: "greenside",
    club: "Your choice",
    ballsPerBlock: 8,
    numBlocks: 3,
    cadenceSeconds: 45,
    practiceMode: "block",
    focusCue: "Open face — splash 2\" behind",
    target: "Pin",
  },
  {
    id: "bunker-fairway-24",
    name: "24-Ball Fairway Bunker",
    whyItHelps: "Fairway bunker lies at real yardages — pick the iron or hybrid that clears the lip every time.",
    focus: "bunker",
    bunkerType: "fairway",
    club: "Your choice",
    ballsPerBlock: 8,
    numBlocks: 3,
    cadenceSeconds: 45,
    practiceMode: "block",
    focusCue: "Clean strike — clear the lip with margin",
    target: "Center of green",
  },
  {
    id: "iron-transition-60",
    name: "60-Ball Mid-Iron — Block → Random",
    whyItHelps: "Research supports moving from blocked repetition to random practice as skill stabilizes — this preset does it in one session.",
    focus: "full-swing",
    club: "7-Iron",
    ballsPerBlock: 10,
    numBlocks: 6,
    cadenceSeconds: 30,
    practiceMode: "transition",
    focusCue: "One clear cue — trust it",
    target: "Center flag",
  },
  {
    id: "lag-putt-30",
    name: "30-Ball Lag Putting — Speed Control",
    whyItHelps: "Long putts with consistent cadence train speed-first thinking — the highest-leverage putting skill for scoring.",
    focus: "putting",
    club: "Putter",
    ballsPerBlock: 10,
    numBlocks: 3,
    cadenceSeconds: 30,
    practiceMode: "block",
    focusCue: "Die the ball at the hole",
    target: "3 ft circle around hole",
  },
];

export function getDrillPresetAvailability(
  preset: BlockDrillPreset,
  userBag: BagEntry[]
): DrillPresetAvailability {
  const focusLabel = focusLabelForPreset(preset.focus);
  if (userBag.length === 0) {
    return { available: false, matchedClubs: [], focusLabel };
  }
  if (preset.focus === "bunker" && preset.bunkerType) {
    const matchedClubs = filterClubsForBunkerScenario(
      userBag.map(e => e.club),
      preset.bunkerType
    );
    return {
      available: matchedClubs.length > 0,
      matchedClubs,
      focusLabel: preset.bunkerType === "fairway" ? "fairway bunker clubs" : focusLabel,
    };
  }
  const matchedClubs = pickClubsForBlockDrillPreset(preset, userBag);
  return {
    available: matchedClubs.length > 0,
    matchedClubs,
    focusLabel,
  };
}

export function loadBlockDrillPreset(id: string, userBag: BagEntry[] = []): SessionConfig | null {
  const preset = BLOCK_DRILL_LIBRARY.find(d => d.id === id);
  if (!preset) return null;

  if (userBag.length === 0) return null;

  if (preset.focus === "bunker" || preset.focus === "chipping") {
    if (preset.focus === "bunker" && preset.bunkerType) {
      const matched = filterClubsForBunkerScenario(
        userBag.map(e => e.club),
        preset.bunkerType
      );
      if (matched.length === 0) return null;
    }
    return createBuilderSessionConfig({
      focus: preset.focus,
      clubs: [],
      swingLength: preset.swingLength,
      ballsPerBlock: preset.ballsPerBlock,
      numBlocks: preset.numBlocks,
      cadenceSeconds: preset.cadenceSeconds,
      practiceMode: preset.practiceMode,
      focusCue: preset.focusCue,
      target: preset.target,
      bunkerType: preset.bunkerType,
      chippingBlockLie: preset.chippingBlockLie,
      chippingBlockGreen: preset.chippingBlockGreen,
      userBag,
    });
  }

  const clubs = pickClubsForBlockDrillPreset(preset, userBag);
  if (clubs.length === 0) return null;

  return createBuilderSessionConfig({
    focus: preset.focus,
    clubs,
    swingLength: preset.swingLength,
    ballsPerBlock: preset.ballsPerBlock,
    numBlocks: preset.numBlocks,
    cadenceSeconds: preset.cadenceSeconds,
    practiceMode: preset.practiceMode,
    focusCue: preset.focusCue,
    target: preset.target,
    bunkerType: preset.bunkerType,
    chippingBlockLie: preset.chippingBlockLie,
    chippingBlockGreen: preset.chippingBlockGreen,
    userBag,
  });
}
