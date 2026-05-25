import { ALL_DRILLS, getDrillsByCategory } from "./drills";
import type { BuilderFocus, BuilderPracticeMode, Drill, SessionConfig, SkillCategory, SwingLength } from "./types";
import {
  getClubsInBagForBuilderFocus,
  poolForSkillAndBag,
  applyBagToDrill,
  drillFromBagEntry,
  clubInBag,
  resolveClubsForBuilderFocus,
  type BagEntry,
} from "./bag";
import { shotForChipping, drillWithinChippingRange } from "./chipping";
import { generateChippingScenariosForSession } from "./chipping-scenarios";
import { generateBunkerScenarios, bunkerSessionTitle } from "./bunker-scenarios";
import type { BunkerPracticeType } from "./types";
import { buildPerRepIntentions, blockUsesRandomMode } from "./intentions";
import { shotForSwingLength } from "./partial-shots";
import { attachWarmupToSession } from "./generators";

export const BUILDER_FOCUS_OPTIONS: { value: BuilderFocus; label: string; categories: SkillCategory[] }[] = [
  { value: "full-swing", label: "Full Swing", categories: ["driver", "fairway-woods", "long-irons", "mid-irons", "short-irons", "wedges", "tempo", "full-swing"] },
  { value: "pitching", label: "Pitching", categories: ["wedges", "short-irons", "short-game"] },
  { value: "chipping", label: "Chipping (≤30 yd)", categories: ["short-game", "wedges", "short-irons"] },
  { value: "putting", label: "Putting", categories: ["putting"] },
  { value: "bunker", label: "Bunker", categories: ["bunker"] },
];

export const BALLS_PER_BLOCK_OPTIONS = [10, 20, 30] as const;
export const BLOCK_COUNT_OPTIONS = [2, 3, 4, 5, 6] as const;
export const CADENCE_OPTIONS = [15, 30, 45] as const;

export function getCategoriesForFocus(focus: BuilderFocus): SkillCategory[] {
  return BUILDER_FOCUS_OPTIONS.find(f => f.value === focus)!.categories;
}

export function getClubsForBuilderFocus(focus: BuilderFocus, bag: BagEntry[] = []): string[] {
  return getClubsInBagForBuilderFocus(focus, bag).sort((a, b) => a.localeCompare(b));
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDrillForClub(
  club: string,
  focus: BuilderFocus,
  bag: BagEntry[],
  swingLength: SwingLength,
  target?: string,
  focusCue?: string
): Drill {
  const categories = getCategoriesForFocus(focus);
  const primarySkill = categories[0];
  const entry = bag.find(e => e.club === club);

  let pool: Drill[] = [];
  for (const cat of categories) {
    pool.push(...poolForSkillAndBag(cat, bag));
  }
  pool = pool.filter(d => clubInBag(d.club, [club]));
  if (focus === "chipping") {
    pool = pool.filter(d => drillWithinChippingRange(d.distance));
  }

  let base =
    pool.find(d => d.club === club) ??
    (entry ? drillFromBagEntry(entry, primarySkill, swingLength) : null);

  if (!base && entry) {
    base = drillFromBagEntry(entry, primarySkill, swingLength);
  }
  if (!base) {
    base = getDrillsByCategory(categories).find(d => clubInBag(d.club, [club])) ?? ALL_DRILLS[0];
    base = { ...base, club };
  }

  if (focus === "chipping") {
    const shot = shotForChipping();
    base = {
      ...base,
      club,
      category: "short-game",
      distance: shot.distance,
      instructions: `${shot.swingLabel} — ${shot.cue}`,
    };
  } else if (entry && entry.carry > 0) {
    const shot = shotForSwingLength(entry.carry, swingLength, focus);
    base = {
      ...base,
      club: entry.club,
      distance: shot.distance,
      instructions: `${shot.swingLabel} — ${shot.cue}`,
    };
  } else if (bag.length > 0) {
    base = applyBagToDrill(base, bag);
  }

  const instructions = focusCue
    ? `${base.instructions || ""} • ${focusCue}`.trim()
    : base.instructions;

  return {
    ...base,
    club,
    target: target || base.target,
    instructions,
  };
}

/**
 * Builds a multi-block session with one or more clubs and optional partial swings.
 */
export function createBuilderSessionConfig(params: {
  focus: BuilderFocus;
  clubs: string[];
  ballsPerBlock: number;
  numBlocks: number;
  cadenceSeconds: number;
  practiceMode: BuilderPracticeMode;
  swingLength?: SwingLength;
  focusCue?: string;
  target?: string;
  userBag?: BagEntry[];
  bunkerType?: BunkerPracticeType;
  chippingBlockLie?: string;
  chippingBlockGreen?: string;
}): SessionConfig | null {
  const {
    focus,
    ballsPerBlock,
    numBlocks,
    cadenceSeconds,
    practiceMode,
    focusCue,
    target,
    swingLength = "full",
  } = params;

  const bag = params.userBag ?? [];
  if (bag.length === 0) return null;

  // Chipping & bunker are scenario-based: lie, distance, and green context per rep.
  // The player chooses their own club during the session — no club selection needed here.
  if (focus === "chipping" || focus === "bunker") {
    const totalShots = ballsPerBlock * numBlocks;
    const bunkerType = params.bunkerType ?? "greenside";
    const modeLabel =
      practiceMode === "block" ? "Block" :
      practiceMode === "random" ? "Random" : "Block → Random";
    const drills =
      focus === "chipping"
        ? generateChippingScenariosForSession({
            ballsPerBlock,
            numBlocks,
            practiceMode,
            blockLieLabel: params.chippingBlockLie,
            blockGreen: params.chippingBlockGreen,
          })
        : generateBunkerScenarios(totalShots, bunkerType);
    const title =
      focus === "chipping"
        ? `${modeLabel} Chipping · ${numBlocks}×${ballsPerBlock}`
        : bunkerSessionTitle(bunkerType, `${numBlocks}×${ballsPerBlock}`);
    return attachWarmupToSession(
      {
        type: "block",
        title,
        durationMinutes: 0,
        focusAreas: getCategoriesForFocus(focus),
        drills,
        focusCue,
        builderFocus: focus,
        bunkerType: focus === "bunker" ? bunkerType : undefined,
        chippingBlockLie: focus === "chipping" ? params.chippingBlockLie : undefined,
        chippingBlockGreen: focus === "chipping" ? params.chippingBlockGreen : undefined,
        clubs: [],
        ballsPerBlock,
        numBlocks,
        cadenceSeconds,
        practiceMode,
      },
      { userBag: bag }
    );
  }

  const selectedClubs = resolveClubsForBuilderFocus(params.clubs, focus, bag);
  if (selectedClubs.length === 0) return null;

  const categories = getCategoriesForFocus(focus);
  const drills: Drill[] = [];

  for (let b = 0; b < numBlocks; b++) {
    const isRandom = blockUsesRandomMode(b, numBlocks, practiceMode);
    const blockClub = selectedClubs[b % selectedClubs.length];

    for (let r = 0; r < ballsPerBlock; r++) {
      const repClub = isRandom
        ? selectedClubs[(b * ballsPerBlock + r) % selectedClubs.length]
        : blockClub;
      const repSwing: SwingLength =
        swingLength === "random" ? "random" : swingLength;

      const drill = buildDrillForClub(repClub, focus, bag, repSwing, target, focusCue);
      drills.push({
        ...drill,
        id: `${drill.id}-b${b}-r${r}`,
        name: `${drill.club} ${drill.distance} (Block ${b + 1})`,
      });
    }
  }

  const clubLabel =
    selectedClubs.length === 1
      ? selectedClubs[0]
      : `${selectedClubs.length} clubs`;
  const swingLabel =
    swingLength === "full" ? "" :
    swingLength === "three-quarter" ? " · 3/4" :
    swingLength === "half" ? " · 1/2" : " · Mix";

  const modeLabel =
    practiceMode === "block" ? "Block" :
    practiceMode === "random" ? "Random" : "Block → Random";

  const totalBalls = ballsPerBlock * numBlocks;
  const perRepIntentions = buildPerRepIntentions(
    drills,
    practiceMode,
    ballsPerBlock,
    numBlocks
  );

  return attachWarmupToSession(
    {
      type: "block",
      title: `${modeLabel}: ${clubLabel}${swingLabel} · ${numBlocks}×${ballsPerBlock}`,
      durationMinutes: 0,
      focusAreas: categories,
      drills,
      focusCue,
      builderFocus: focus,
      club: selectedClubs[0],
      clubs: selectedClubs,
      swingLength,
      ballsPerBlock,
      numBlocks,
      cadenceSeconds,
      practiceMode,
      perRepIntentions,
    },
    { userBag: bag }
  );
}
