import { ALL_DRILLS, getDrillsByCategory } from "./drills";
import { Drill, SessionConfig, SkillCategory } from "./types";
import { generateChippingScenario } from "./chipping-scenarios";
import { generateBunkerScenario, generateBunkerScenarios, bunkerSessionTitle } from "./bunker-scenarios";
import type { BunkerPracticeType } from "./types";
import {
  type BagEntry,
  clubInBag,
  carryToCategory,
  poolForSkillAndBag,
  applyBagToDrill,
  drillFromBagEntry,
  bagEntryMatchesSkill,
  isPutterClub,
  isWedgeClubName,
} from "./bag";

// ─── Augmented pool ───────────────────────────────────────────────────────────
// Creates generic drills for bag clubs that have no matching library drill,
// so custom clubs (e.g. "GW (48°)") are always included.
function buildAugmentedPool(bag: BagEntry[]): Drill[] {
  const result = [...ALL_DRILLS];
  for (const entry of bag) {
    if (entry.carry === 0) continue; // putter — no carry drill needed
    const hasLibraryMatch = ALL_DRILLS.some(d => clubInBag(d.club, [entry.club]));
    if (hasLibraryMatch) continue;
    result.push({
      id: `custom-${entry.club.replace(/[\s°()]/g, "-").toLowerCase()}`,
      name: `${entry.club} — ${entry.carry} yd Stock`,
      category: carryToCategory(entry.carry),
      club: entry.club,
      distance: `${entry.carry} yd`,
      target: "Center flag",
      shotShape: "any",
      instructions: `Commit to your ${entry.carry} yd stock swing. Full pre-shot routine.`,
    });
  }
  return result;
}

const WEDGE_CATEGORIES = new Set<SkillCategory>(["wedges", "short-irons"]);

// Returns a random partial distance (50–100% of carry, 5-yd steps) plus
// the matching swing-type instruction so the cue is always accurate.
function randomWedgeShot(carry: number): { distance: string; instructions: string } {
  const min   = Math.max(40, Math.round(carry * 0.5 / 5) * 5);
  const steps = Math.floor((carry - min) / 5);
  const yards = min + Math.floor(Math.random() * (steps + 1)) * 5;
  const pct   = yards / carry;

  let swingType: string;
  let cue: string;

  if (pct >= 0.9) {
    swingType = "Full swing";
    cue = "Normal tempo — commit and finish high";
  } else if (pct >= 0.75) {
    swingType = "3/4 swing";
    cue = "Backswing to shoulder height — smooth acceleration through impact";
  } else if (pct >= 0.55) {
    swingType = "Half swing";
    cue = "Hands to hip height — quiet lower body, let the club fall";
  } else {
    swingType = "Quarter swing";
    cue = "Small backswing — focus on clean contact and pure feel";
  }

  return {
    distance: `${yards} yd`,
    instructions: `${swingType} — ${cue}`,
  };
}

// Replace library drill's club name and distance with the user's actual bag data.
// Wedges get a random partial distance + matching swing-type instruction.
function withBagData(drill: Drill, bag: BagEntry[]): Drill {
  if (bag.length === 0) return drill;
  const entry = bag.find(e => clubInBag(drill.club, [e.club]));
  if (!entry) return drill;
  if (entry.carry === 0 || drill.category === "putting") {
    return { ...drill, club: entry.club };
  }
  if (WEDGE_CATEGORIES.has(drill.category)) {
    const { distance, instructions } = randomWedgeShot(entry.carry);
    return { ...drill, club: entry.club, distance, instructions };
  }
  return { ...drill, club: entry.club, distance: `${entry.carry} yd` };
}

function parseDrillDistance(drill: Drill): number {
  // Handles "150 yd", "30-50 yd", "Full", "8 ft", etc.
  const distStr = drill.distance.toLowerCase();
  if (distStr.includes("full")) return 999;
  if (distStr.includes("ft")) {
    const ft = parseFloat(distStr);
    return ft * 0.333; // rough yards
  }
  const match = distStr.match(/(\d+)(?:-(\d+))?/);
  if (!match) return 0;
  const low = parseInt(match[1], 10);
  const high = match[2] ? parseInt(match[2], 10) : low;
  return (low + high) / 2;
}

const WARMUP_MAX_YARDS = 100;

const WARMUP_CATEGORIES = new Set<SkillCategory>(["wedges", "short-game"]);

const DEFAULT_WARMUP_AREAS: SkillCategory[] = ["wedges", "short-game"];

function drillInYardageRange(drill: Drill, minDist: number, maxDist: number): boolean {
  const yards = parseDrillDistance(drill);
  return yards >= minDist && yards <= maxDist;
}

/** Drop categories that can't produce shots inside the selected yardage window */
function areasForYardageFilter(
  areas: SkillCategory[],
  minDist: number,
  maxDist: number
): SkillCategory[] {
  return areas.filter(cat => {
    if (cat === "putting") return minDist <= 15;
    if (cat === "short-game") return minDist <= 55 && maxDist >= 15;
    if (cat === "bunker") return minDist <= 175 && maxDist >= 8;
    if (cat === "wedges") return minDist <= 110 && maxDist >= 35;
    return true;
  });
}

/** Warm-up is skipped only for short-game-only sessions (chipping/putting/bunker). */
export function randomSessionWillIncludeWarmup(options: {
  focusAreas?: SkillCategory[];
}): boolean {
  const areas = options.focusAreas?.length ? options.focusAreas : DEFAULT_WARMUP_AREAS;

  const isShortGameOnly =
    areas.length > 0 &&
    areas.every(a => a === "short-game" || a === "putting" || a === "bunker");

  return !isShortGameOnly;
}

function synthesizeRandomDrillFromBag(
  category: SkillCategory,
  bag: BagEntry[],
  minDist: number,
  maxDist: number
): Drill | null {
  const matching = bag.filter(e => {
    if (e.carry <= 0) return category === "putting";
    if (!bagEntryMatchesSkill(e, category)) return false;
    return e.carry >= minDist && e.carry <= maxDist;
  });
  if (matching.length === 0) return null;
  const entry = matching[Math.floor(Math.random() * matching.length)];
  return applyBagToDrill(drillFromBagEntry(entry, category), bag);
}

function pickRandomPracticeDrill(params: {
  category: SkillCategory;
  allDrills: Drill[];
  bag: BagEntry[];
  minDist: number;
  maxDist: number;
  usedLast: string[];
  filterByBag: (pool: Drill[]) => Drill[];
}): Drill {
  const { category, allDrills, bag, minDist, maxDist, usedLast, filterByBag } = params;

  const inRange = (d: Drill) => drillInYardageRange(d, minDist, maxDist);

  let pool = filterByBag(
    allDrills
      .filter(d => d.category === category)
      .filter(d => !usedLast.includes(d.club + (d.target ?? "")))
      .filter(inRange)
  );

  if (pool.length > 0) {
    return withBagData(pool[Math.floor(Math.random() * pool.length)], bag);
  }

  const fromBag = synthesizeRandomDrillFromBag(category, bag, minDist, maxDist);
  if (fromBag) return fromBag;

  pool = filterByBag(
    allDrills.filter(d => d.category === category && inRange(d))
  );
  if (pool.length > 0) {
    return withBagData(pool[Math.floor(Math.random() * pool.length)], bag);
  }

  const anyInCategory = filterByBag(allDrills.filter(d => d.category === category));
  if (anyInCategory.length > 0) {
    return withBagData(anyInCategory[Math.floor(Math.random() * anyInCategory.length)], bag);
  }

  return withBagData(allDrills[0] ?? ALL_DRILLS[0], bag);
}

function isNumberedIronClub(club: string): boolean {
  const m = club.match(/(\d+)\s*-?\s*iron/i);
  if (!m) return /\biron\b/i.test(club) && !isWedgeClubName(club);
  return parseInt(m[1], 10) >= 6;
}

function isWarmupEligibleDrill(drill: Drill): boolean {
  if (drill.category === "putting" || drill.category === "bunker") return false;
  if (!WARMUP_CATEGORIES.has(drill.category)) return false;
  if (isPutterClub(drill.club)) return false;
  if (isNumberedIronClub(drill.club)) return false;
  return parseDrillDistance(drill) <= WARMUP_MAX_YARDS;
}

/** Warm-up uses partial wedge/chip distances — never full 7-iron stock carries */
function withWarmupBagData(drill: Drill, bag: BagEntry[]): Drill | null {
  if (bag.length === 0) {
    if (!isWarmupEligibleDrill(drill)) return null;
    return drill;
  }

  const entry = bag.find(e => clubInBag(drill.club, [e.club]));
  if (entry && (isPutterClub(entry.club) || entry.carry === 0)) return null;

  let result = withBagData(drill, bag);
  if (result.category === "putting" || isPutterClub(result.club)) return null;

  const carry = entry?.carry ?? parseDrillDistance(result);
  if (carry > WARMUP_MAX_YARDS || parseDrillDistance(result) > WARMUP_MAX_YARDS) {
    const base = Math.min(carry > 0 ? carry : WARMUP_MAX_YARDS, WARMUP_MAX_YARDS);
    const { distance, instructions } = randomWedgeShot(Math.max(40, base));
    result = {
      ...result,
      club: entry?.club ?? result.club,
      distance,
      instructions: `${instructions} · Easy tempo — feel the motion`,
    };
  }

  if (parseDrillDistance(result) > WARMUP_MAX_YARDS) return null;
  if (entry && entry.carry > WARMUP_MAX_YARDS && !isWedgeClubName(entry.club)) return null;

  return result;
}

function buildWarmupDrillsFromBag(bag: BagEntry[], count: number): Drill[] {
  const clubs = bag
    .filter(e => {
      if (isPutterClub(e.club) || e.carry <= 0 || e.carry > 130) return false;
      if (isNumberedIronClub(e.club) && !isWedgeClubName(e.club)) return false;
      return true;
    })
    .sort((a, b) => a.carry - b.carry);

  if (clubs.length === 0) return [];

  const drills: Drill[] = [];
  for (let i = 0; i < count; i++) {
    const entry = clubs[i % clubs.length];
    const { distance, instructions } = randomWedgeShot(Math.min(entry.carry, WARMUP_MAX_YARDS));
    drills.push({
      id: `warmup-bag-${entry.club.replace(/[\s°()]/g, "-").toLowerCase()}-${i}`,
      name: `Warm-up · ${entry.club} ${distance}`,
      category: carryToCategory(entry.carry),
      club: entry.club,
      distance,
      target: "Landing spot",
      shotShape: "any",
      sessionPhase: "warmup",
      instructions: `${instructions} · Easy tempo — no shape pressure yet`,
    });
  }
  return drills;
}

/** Short-club warm-up block before random practice — wedges & chips, shortest first */
export function generateRandomWarmupDrills(options: {
  count?: number;
  focusAreas?: SkillCategory[];
  userBag?: BagEntry[];
  minDistance?: number;
  maxDistance?: number;
}): Drill[] {
  const count = options.count ?? 10;
  const bag = options.userBag ?? [];
  const bagClubs = bag.map(e => e.club);
  // Warm-up is always short-club — never inherit the practice yardage filter.
  const minDist = 0;
  const maxDist = WARMUP_MAX_YARDS;

  const allDrills = buildAugmentedPool(bag);

  function filterWarmupPool(pool: Drill[]): Drill[] {
    return pool
      .filter(isWarmupEligibleDrill)
      .filter(d => {
        const yards = parseDrillDistance(d);
        return yards >= minDist && yards <= maxDist;
      })
      .filter(d => (bagClubs.length === 0 ? true : clubInBag(d.club, bagClubs)))
      .sort((a, b) => parseDrillDistance(a) - parseDrillDistance(b));
  }

  let pool = filterWarmupPool(allDrills);
  if (pool.length === 0) {
    pool = filterWarmupPool(
      allDrills.filter(d => DEFAULT_WARMUP_AREAS.includes(d.category))
    );
  }

  const drills: Drill[] = [];
  const usedLast: string[] = [];

  for (let i = 0; i < count; i++) {
    const available = pool.filter(d => !usedLast.includes(d.club));
    const pickFrom = available.length > 0 ? available : pool;
    const template = pickFrom[i % Math.max(pickFrom.length, 1)] ?? pickFrom[0];
    if (!template) break;

    const warmed = withWarmupBagData(template, bag);
    if (!warmed) continue;

    drills.push({
      ...warmed,
      id: `${warmed.id}-warmup-${i}`,
      sessionPhase: "warmup",
      name: `Warm-up · ${warmed.name}`,
      instructions: warmed.instructions
        ? `${warmed.instructions} · Easy tempo — feel the motion`
        : "Easy tempo — short club, smooth rhythm, no shape pressure yet",
    });
    usedLast.push(warmed.club);
    if (usedLast.length > 2) usedLast.shift();
  }

  if (drills.length < count) {
    const fromBag = buildWarmupDrillsFromBag(bag, count - drills.length);
    drills.push(...fromBag);
  }

  return drills.slice(0, count);
}

export type WarmupAttachOptions = {
  warmupShots?: number;
  userBag?: BagEntry[];
  minDistance?: number;
  maxDistance?: number;
};

/** Prepends short-club warm-up shots. Skips games and sessions that already have warm-up. */
export function attachWarmupToSession(
  config: SessionConfig,
  options: WarmupAttachOptions = {}
): SessionConfig {
  if (
    config.type === "game" ||
    config.type === "planned" ||
    (config.warmupShotCount ?? 0) > 0
  ) {
    return config;
  }

  // Short-game / putting / bunker sessions don't need a warm-up phase —
  // chipping IS its own warm-up, and adding full-swing wedge drills first
  // disrupts the feel calibration the session is designed to build.
  //
  // Check builderFocus first (set by the Practice Builder) because the builder
  // maps "chipping" to focusAreas: ["short-game", "wedges", "short-irons"] —
  // "wedges" and "short-irons" would fool a focusAreas-only check.
  const SHORT_GAME_BUILDER_FOCUSES = new Set(["chipping", "putting", "bunker"]);
  const SHORT_GAME_AREAS = new Set(["short-game", "putting", "bunker"]);
  const isShortGameOnly =
    (config.builderFocus != null && SHORT_GAME_BUILDER_FOCUSES.has(config.builderFocus)) ||
    (config.focusAreas.length > 0 && config.focusAreas.every(a => SHORT_GAME_AREAS.has(a)));
  if (isShortGameOnly) return config;

  if (
    (config.type === "random" || config.type === "mixed") &&
    !randomSessionWillIncludeWarmup({ focusAreas: config.focusAreas })
  ) {
    return config;
  }

  const areas = config.focusAreas?.length ? config.focusAreas : DEFAULT_WARMUP_AREAS;
  const warmup = generateRandomWarmupDrills({
    count: options.warmupShots ?? 10,
    focusAreas: areas,
    userBag: options.userBag,
    minDistance: options.minDistance,
    maxDistance: options.maxDistance,
  });

  const practiceDrills = config.drills.map(d =>
    d.sessionPhase ? d : { ...d, sessionPhase: "practice" as const }
  );

  let perRepIntentions = config.perRepIntentions;
  if (perRepIntentions?.length) {
    perRepIntentions = [...Array(warmup.length).fill(null), ...perRepIntentions];
  }

  return {
    ...config,
    drills: [...warmup, ...practiceDrills],
    warmupShotCount: warmup.length,
    perRepIntentions,
  };
}

/** Random session with a short-club warm-up block, then full interleaved practice */
export function generateRandomSessionWithWarmup(
  options: Parameters<typeof generateRandomSession>[0] & { warmupShots?: number }
): SessionConfig {
  const areas = options.focusAreas?.length
    ? options.focusAreas
    : (["mid-irons", "wedges", "short-game", "putting"] as SkillCategory[]);
  const warmupCount = options.warmupShots ?? 10;
  const includesWarmup = randomSessionWillIncludeWarmup({ focusAreas: areas });

  const practice = generateRandomSession({
    ...options,
    focusAreas: areas,
    durationMinutes:
      options.durationMinutes != null
        ? includesWarmup
          ? Math.max(25, options.durationMinutes - 12)
          : options.durationMinutes
        : undefined,
    numShots:
      options.numShots != null
        ? includesWarmup
          ? Math.max(25, options.numShots - warmupCount)
          : options.numShots
        : undefined,
  });

  const areaLabel =
    areas.length > 2 ? "Full-Bag" : areas.map(a => a.replace("-", " ")).join(" + ");

  const attached = attachWarmupToSession(
    {
      ...practice,
      title: practice.title,
      drills: practice.drills.map(d => ({ ...d, sessionPhase: "practice" as const })),
      focusCue:
        "Commit to each random shot like on the course — varied club, distance, and shape.",
    },
    {
      warmupShots: warmupCount,
      userBag: options.userBag,
      minDistance: options.minDistance,
      maxDistance: options.maxDistance,
    }
  );

  const hasWarmup = (attached.warmupShotCount ?? 0) > 0;
  return {
    ...attached,
    title: hasWarmup
      ? `Random ${areaLabel} · Warm-up + Practice`
      : practice.title,
  };
}

// ─── Random Session ───────────────────────────────────────────────────────────
export function generateRandomSession(options: {
  durationMinutes?: number;
  numShots?: number;
  focusAreas?: SkillCategory[];
  userBag?: BagEntry[];
  minDistance?: number;
  maxDistance?: number;
  bunkerType?: BunkerPracticeType;
}): SessionConfig {
  const duration  = options.durationMinutes ?? 45;
  const numShots  = options.numShots ?? Math.round(duration * 1.6);
  const areas     = options.focusAreas?.length
    ? options.focusAreas
    : ["mid-irons", "wedges", "short-game", "putting"] as SkillCategory[];
  const bag       = options.userBag ?? [];
  const bagClubs  = bag.map(e => e.club);
  const minDist   = options.minDistance ?? 0;
  const maxDist   = options.maxDistance ?? 9999;
  const bunkerType = options.bunkerType ?? "greenside";
  const yardageFilterActive = options.minDistance != null || options.maxDistance != null;
  const practiceAreas = yardageFilterActive
    ? areasForYardageFilter(areas, minDist, maxDist)
    : areas;
  const shotAreas = practiceAreas.length > 0 ? practiceAreas : areas;

  const allDrills = buildAugmentedPool(bag);

  function filterByBag(pool: Drill[]): Drill[] {
    if (bagClubs.length === 0) return pool;
    const matched = pool.filter(d => clubInBag(d.club, bagClubs));
    return matched.length > 0 ? matched : pool;
  }

  const drills: Drill[] = [];
  const usedLast: string[] = [];

  for (let i = 0; i < numShots; i++) {
    const category = shotAreas[Math.floor(Math.random() * shotAreas.length)];

    if (category === "short-game") {
      drills.push(generateChippingScenario(`random-chip-${i}-${Date.now()}`));
      usedLast.push("chip");
      if (usedLast.length > 2) usedLast.shift();
      continue;
    }
    if (category === "bunker") {
      drills.push(generateBunkerScenario(`random-bunker-${i}-${Date.now()}`, bunkerType));
      usedLast.push("bunker");
      if (usedLast.length > 2) usedLast.shift();
      continue;
    }

    const chosen = pickRandomPracticeDrill({
      category,
      allDrills,
      bag,
      minDist,
      maxDist,
      usedLast,
      filterByBag,
    });
    drills.push(chosen);
    usedLast.push(chosen.club + (chosen.target ?? ""));
    if (usedLast.length > 2) usedLast.shift();
  }

  const title = `Random ${areas.length > 2 ? "Full-Bag" : areas.map(a => a.replace("-", " ")).join(" + ")} • ${duration} min`;

  return {
    type: "random",
    title,
    durationMinutes: duration,
    focusAreas: areas,
    drills,
    focusCue: undefined,
    bunkerType: areas.includes("bunker") ? bunkerType : undefined,
  };
}

// ─── Mixed Session ────────────────────────────────────────────────────────────
export function generateMixedSession(options: {
  durationMinutes?: number;
  focusAreas?: SkillCategory[];
  userBag?: BagEntry[];
  minDistance?: number;
  maxDistance?: number;
}) {
  const duration = options.durationMinutes ?? 60;
  const areas = options.focusAreas ?? ["mid-irons", "wedges", "short-game"];
  const bag = options.userBag ?? [];
  const minDist = options.minDistance ?? 0;
  const maxDist = options.maxDistance ?? 9999;

  const randomConfig = generateRandomSession({
    durationMinutes: Math.max(25, duration - 12),
    numShots: Math.floor(Math.max(25, duration - 12) * 1.4),
    focusAreas: areas,
    userBag: bag,
    minDistance: minDist,
    maxDistance: maxDist,
  });

  const areaLabel =
    areas.length > 2 ? "Full-Bag" : areas.map(a => a.replace("-", " ")).join(" + ");

  return attachWarmupToSession(
    {
      type: "mixed",
      title: `Mixed ${areaLabel} · Warm-up + Random`,
      durationMinutes: duration,
      focusAreas: areas,
      drills: randomConfig.drills.map(d => ({ ...d, sessionPhase: "practice" as const })),
      focusCue: "After warm-up: block-style feel, then random shots for course transfer.",
    },
    { userBag: bag, minDistance: minDist, maxDistance: maxDist }
  );
}

// ─── Block Config ─────────────────────────────────────────────────────────────
export function createBlockConfig(params: {
  skill: SkillCategory;
  reps: number;
  club?: string;
  target?: string;
  focusCue?: string;
  minDistance?: number;
  maxDistance?: number;
  userBag?: BagEntry[];
  bunkerType?: BunkerPracticeType;
}): SessionConfig | null {
  const minDist = params.minDistance ?? 0;
  const maxDist = params.maxDistance ?? 9999;
  const bag = params.userBag ?? [];
  if (bag.length === 0) return null;

  if (params.skill === "bunker") {
    const bunkerType = params.bunkerType ?? "greenside";
    const drills = generateBunkerScenarios(params.reps, bunkerType);
    return attachWarmupToSession(
      {
        type: "block",
        title: bunkerSessionTitle(bunkerType, `${params.reps} shots`),
        durationMinutes: 0,
        focusAreas: ["bunker"],
        drills,
        focusCue: params.focusCue,
        bunkerType,
      },
      { userBag: bag, minDistance: params.minDistance, maxDistance: params.maxDistance }
    );
  }

  let pool = poolForSkillAndBag(params.skill, bag);

  if (params.minDistance != null || params.maxDistance != null) {
    pool = pool.filter(d => {
      const yards = parseDrillDistance(d);
      return yards >= minDist && yards <= maxDist;
    });
  }

  if (pool.length === 0) return null;

  const bagClubs = bag.map(e => e.club);
  let base = pool[0] || ALL_DRILLS[0];

  if (params.club) {
    const match = pool.find(d => clubInBag(d.club, [params.club!]));
    if (match) base = match;
    else if (bag.length > 0) {
      const entry = bag.find(e => clubInBag(params.club!, [e.club]));
      if (entry) base = poolForSkillAndBag(params.skill, [entry])[0] ?? drillFromBagEntry(entry, params.skill);
    }
  }

  base = applyBagToDrill(base, bag);

  const displayClub =
    params.club && bagClubs.includes(params.club) ? params.club : base.club;

  const drills = Array.from({ length: params.reps }, (_, i) => ({
    ...base,
    id: `${base.id}-block-${i}`,
    club: displayClub,
    target: params.target || base.target,
    instructions: params.focusCue
      ? `${base.instructions || ""} • ${params.focusCue}`
      : base.instructions,
  }));

  return attachWarmupToSession(
    {
      type: "block",
      title: `Block: ${displayClub} — ${params.reps} reps`,
      durationMinutes: 0,
      focusAreas: [params.skill],
      drills,
      focusCue: params.focusCue,
      club: displayClub,
    },
    {
      userBag: bag,
      minDistance: params.minDistance,
      maxDistance: params.maxDistance,
    }
  );
}
