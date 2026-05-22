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
  const areas    = options.focusAreas ?? ["mid-irons", "wedges", "short-game"];
  const bag      = options.userBag ?? [];
  const minDist  = options.minDistance ?? 0;
  const maxDist  = options.maxDistance ?? 9999;

  // Warm-up: pick a drill from the first focus area, preferring bag clubs
  const warmupCategory = areas[0];
  let warmupPool = getDrillsByCategory([warmupCategory]);

  // Apply distance filter to warmup
  warmupPool = warmupPool.filter(d => {
    const dYards = parseDrillDistance(d);
    return dYards >= minDist && dYards <= maxDist;
  });

  const bagFiltered = bag.length > 0
    ? warmupPool.filter(d => clubInBag(d.club, bag.map(e => e.club)))
    : warmupPool;

  const poolToPickFrom = bagFiltered.length > 0 ? bagFiltered : warmupPool;
  const baseWarmup = poolToPickFrom.length > 0
    ? poolToPickFrom[Math.floor(Math.random() * poolToPickFrom.length)]
    : getDrillsByCategory([warmupCategory])[0] ?? ALL_DRILLS[0];

  const warmupDrill = withBagData(baseWarmup, bag);

  const warmupDrills = Array.from({ length: 10 }, (_, i) => ({
    ...warmupDrill,
    id: `${warmupDrill.id}-warm-${i}`,
    name: `${warmupDrill.name} (Block Warm-up)`,
  }));

  const randomConfig = generateRandomSession({
    durationMinutes: duration - 15,
    numShots: Math.floor((duration - 15) * 1.4),
    focusAreas: areas,
    userBag: bag,
    minDistance: minDist,
    maxDistance: maxDist,
  });

  return {
    type: "mixed" as const,
    title: `Mixed: ${warmupDrill.club} Warm-up + Random ${areas[0]}`,
    durationMinutes: duration,
    focusAreas: areas,
    drills: [...warmupDrills, ...randomConfig.drills],
    focusCue: "Start smooth — build speed only after the 8th ball",
  };
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

  return {
    type: "block",
    title: `Block: ${displayClub} — ${params.reps} reps`,
    durationMinutes: 0,
    focusAreas: [params.skill],
    drills,
    focusCue: params.focusCue,
    club: displayClub,
  };
}
