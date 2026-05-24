import { ALL_DRILLS, getDrillsByCategory } from "./drills";
import { Drill, SessionConfig, SkillCategory } from "./types";
import {
  type BagEntry,
  clubInBag,
  carryToCategory,
  poolForSkillAndBag,
  applyBagToDrill,
  drillFromBagEntry,
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

const WARMUP_CATEGORIES = new Set<SkillCategory>([
  "short-game",
  "wedges",
  "short-irons",
  "tempo",
]);

const DEFAULT_WARMUP_AREAS: SkillCategory[] = ["wedges", "short-game", "short-irons"];

/** Short-club warm-up block before random practice — sorted shortest distance first */
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
  const minDist = options.minDistance ?? 0;
  const maxDist = options.maxDistance ?? 9999;
  const maxWarmupYards = 130;

  const allDrills = buildAugmentedPool(bag);

  function filterWarmupPool(pool: Drill[]): Drill[] {
    return pool
      .filter(d => WARMUP_CATEGORIES.has(d.category))
      .filter(d => {
        const yards = parseDrillDistance(d);
        return yards <= maxWarmupYards && yards >= minDist && yards <= maxDist;
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
  if (pool.length === 0) {
    pool = [...allDrills]
      .filter(d => parseDrillDistance(d) <= maxWarmupYards)
      .sort((a, b) => parseDrillDistance(a) - parseDrillDistance(b));
  }

  const drills: Drill[] = [];
  const usedLast: string[] = [];

  for (let i = 0; i < count; i++) {
    const available = pool.filter(d => !usedLast.includes(d.club));
    const pickFrom = available.length > 0 ? available : pool;
    const chosen = pickFrom[i % pickFrom.length] ?? pickFrom[0] ?? allDrills[0];
    const withBag = withBagData(chosen, bag);
    drills.push({
      ...withBag,
      id: `${withBag.id}-warmup-${i}`,
      sessionPhase: "warmup",
      name: `Warm-up · ${withBag.name}`,
      instructions: withBag.instructions
        ? `${withBag.instructions} · Easy tempo — feel the motion`
        : "Easy tempo — short club, smooth rhythm, no shape pressure yet",
    });
    usedLast.push(chosen.club);
    if (usedLast.length > 2) usedLast.shift();
  }

  return drills;
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

  const practice = generateRandomSession({
    ...options,
    focusAreas: areas,
    durationMinutes:
      options.durationMinutes != null
        ? Math.max(25, options.durationMinutes - 12)
        : undefined,
    numShots:
      options.numShots != null ? Math.max(25, options.numShots - warmupCount) : undefined,
  });

  const areaLabel =
    areas.length > 2 ? "Full-Bag" : areas.map(a => a.replace("-", " ")).join(" + ");

  return attachWarmupToSession(
    {
      ...practice,
      title: `Random ${areaLabel} · Warm-up + Practice`,
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
}

// ─── Random Session ───────────────────────────────────────────────────────────
export function generateRandomSession(options: {
  durationMinutes?: number;
  numShots?: number;
  focusAreas?: SkillCategory[];
  userBag?: BagEntry[];
  minDistance?: number;
  maxDistance?: number;
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

  const allDrills = buildAugmentedPool(bag);

  function byArea(pool: Drill[]): Drill[] {
    return pool.filter(d => areas.includes(d.category));
  }

  function filterByBag(pool: Drill[]): Drill[] {
    if (bagClubs.length === 0) return pool;
    const matched = pool.filter(d => clubInBag(d.club, bagClubs));
    // If bag filtering leaves nothing, keep the area-filtered pool (don't reach outside focus areas)
    return matched.length > 0 ? matched : pool;
  }

  const drills: Drill[] = [];
  const usedLast: string[] = [];

  for (let i = 0; i < numShots; i++) {
    const category   = areas[Math.floor(Math.random() * areas.length)];
    const catPool    = allDrills
      .filter(d => d.category === category)
      .filter(d => !usedLast.includes(d.club + (d.target ?? "")))
      .filter(d => {
        const dYards = parseDrillDistance(d);
        return dYards >= minDist && dYards <= maxDist;
      });
    const pool       = filterByBag(catPool);

    let chosen: Drill;
    if (pool.length > 0) {
      chosen = pool[Math.floor(Math.random() * pool.length)];
    } else {
      // Fallback: stay strictly within focus areas, apply bag filter
      const areaFallback = filterByBag(
        byArea(allDrills).filter(d => !usedLast.includes(d.club))
      );
      chosen = areaFallback.length > 0
        ? areaFallback[Math.floor(Math.random() * areaFallback.length)]
        : byArea(allDrills)[0] ?? ALL_DRILLS[0];
    }

    drills.push(withBagData(chosen, bag));
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
}): SessionConfig | null {
  const minDist = params.minDistance ?? 0;
  const maxDist = params.maxDistance ?? 9999;
  const bag = params.userBag ?? [];
  if (bag.length === 0) return null;

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
