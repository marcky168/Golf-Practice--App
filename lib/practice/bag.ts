import { ALL_DRILLS, getDrillsByCategory } from "./drills";
import { shotForSwingLength } from "./partial-shots";
import type { BuilderFocus, Drill, SkillCategory, SwingLength } from "./types";

const BUILDER_FOCUS_CATEGORIES: Record<BuilderFocus, SkillCategory[]> = {
  "full-swing": ["driver", "fairway-woods", "long-irons", "mid-irons", "short-irons", "wedges", "tempo", "full-swing"],
  chipping: ["short-game", "wedges", "short-irons"],
  pitching: ["wedges", "short-irons", "short-game"],
  putting: ["putting"],
  bunker: ["bunker"],
};

export function isWedgeClubName(name: string): boolean {
  const n = name.toLowerCase();
  return /wedge|°|\bsw\b|\blw\b|\bgw\b|\bpw\b|pitching/.test(n);
}

/** Bump-and-run options — stock carry can exceed 30 yd; session caps chip distance */
export function isNineIronClub(name: string): boolean {
  const n = name.toLowerCase();
  return /9\s*-?\s*iron/i.test(n) || normalizeClubKey(name) === "9iron";
}

export function isHybridClub(name: string): boolean {
  return /hybrid/i.test(name.toLowerCase());
}

function bagEntryMatchesChipping(entry: BagEntry): boolean {
  if (isPutterClub(entry.club)) return false;
  if (isNineIronClub(entry.club) || isHybridClub(entry.club)) return true;
  if (bagEntryMatchesSkill(entry, "short-game")) return true;
  if (bagEntryMatchesSkill(entry, "wedges")) return true;
  if (isWedgeClubName(entry.club)) return true;
  // 8-iron and similar — wedge-length stock carry
  return entry.carry > 0 && entry.carry <= 130;
}

function bagEntryMatchesPitching(entry: BagEntry): boolean {
  if (isPutterClub(entry.club)) return false;
  if (bagEntryMatchesSkill(entry, "wedges") || bagEntryMatchesSkill(entry, "short-irons")) {
    return true;
  }
  return entry.carry >= 30 && entry.carry <= 145;
}

export type BagEntry = { club: string; carry: number };

/** Strip punctuation/spaces so "7-Iron" matches "7 Iron" */
export function normalizeClubKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const WEDGE_ABBREV_ALIASES: Record<string, string[]> = {
  pw: ["pitchingwedge", "pitching"],
  gw: ["gapwedge", "gap"],
  sw: ["sandwedge", "sand"],
  lw: ["lobwedge", "lob"],
};

function aliasKeysForDrillClub(drillClub: string): string[] {
  const k = normalizeClubKey(drillClub);
  const keys = new Set<string>([k]);
  for (const alias of WEDGE_ABBREV_ALIASES[k] ?? []) keys.add(alias);
  const iron = k.match(/^(\d+)iron$/);
  if (iron) keys.add(`iron${iron[1]}`);
  return [...keys];
}

/** Match loft in preset "56°" to profile "SW (56°)" without matching "58°" */
export function loftMatchesBagClub(loft: string, bagClub: string): boolean {
  const patterns = [
    new RegExp(`\\(${loft}\\s*°?\\)`, "i"),
    new RegExp(`\\b${loft}\\s*°`, "i"),
    new RegExp(`${loft}°`, "i"),
  ];
  return patterns.some(p => p.test(bagClub));
}

function normalizedKeysMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  return a.includes(b) || b.includes(a);
}

/** "GW" matches "GW (50°)", "56°" matches "SW (56°)", "7-Iron" matches "7 Iron" */
export function clubInBag(drillClub: string, bagClubs: string[]): boolean {
  const dc = drillClub.toLowerCase().trim();
  const keys = aliasKeysForDrillClub(drillClub);
  const loftMatch = drillClub.match(/(\d+)\s*°/);

  return bagClubs.some(bc => {
    const raw = bc.toLowerCase().trim();
    if (raw === dc || raw.includes(dc) || dc.includes(raw)) return true;

    if (loftMatch && loftMatchesBagClub(loftMatch[1], bc)) return true;

    const b = normalizeClubKey(bc);
    return keys.some(k => normalizedKeysMatch(k, b));
  });
}

/** Map preset/library club labels to profile bag names (any bag club, not focus-filtered) */
export function resolvePresetClubsToBag(requested: string[], bag: BagEntry[]): string[] {
  const resolved: string[] = [];
  for (const req of requested) {
    const match = bag.map(e => e.club).find(bc => clubInBag(req, [bc]));
    if (match && !resolved.includes(match)) resolved.push(match);
  }
  return resolved;
}

/** Map requested clubs for a builder session — prefers bag match, then focus-eligible clubs */
export function resolveClubsForBuilderFocus(
  requested: string[],
  focus: BuilderFocus,
  bag: BagEntry[]
): string[] {
  const fromBag = resolvePresetClubsToBag(requested, bag);
  if (fromBag.length > 0) return fromBag;

  const allowed = getClubsInBagForBuilderFocus(focus, bag);
  const resolved: string[] = [];
  for (const req of requested) {
    const match = allowed.find(bc => clubInBag(req, [bc]));
    if (match && !resolved.includes(match)) resolved.push(match);
  }
  return resolved;
}

export function carryToCategory(carry: number): SkillCategory {
  if (carry === 0) return "putting";
  if (carry < 80) return "short-game";
  if (carry < 130) return "wedges";
  if (carry < 155) return "short-irons";
  if (carry < 190) return "mid-irons";
  if (carry < 215) return "long-irons";
  return "fairway-woods";
}

export function isPutterClub(name: string): boolean {
  return name.toLowerCase().includes("putter");
}

/** Best-effort loft number from names like "SW (56°)" */
export function loftFromClubName(name: string): number {
  const paren = name.match(/\((\d+)\s*°?\)/);
  if (paren) return parseInt(paren[1], 10);
  const deg = name.match(/(\d+)\s*°/);
  if (deg) return parseInt(deg[1], 10);
  return 0;
}

/** Whether a profile bag entry fits a practice skill category */
export function bagEntryMatchesSkill(entry: BagEntry, skill: SkillCategory): boolean {
  if (skill === "putting") {
    return isPutterClub(entry.club) || entry.carry === 0;
  }
  if (skill === "bunker") {
    if (isPutterClub(entry.club)) return false;
    const n = entry.club.toLowerCase();
    if (/wedge|°|\bsw\b|\blw\b|\bgw\b|sand|56|58|60|64/.test(n)) return true;
    return entry.carry > 0 && entry.carry <= 50;
  }
  if (skill === "tempo" || skill === "full-swing") {
    return entry.carry > 0 || (!isPutterClub(entry.club) && entry.carry === 0);
  }

  const pool = getDrillsByCategory([skill]);
  if (pool.some(d => clubInBag(d.club, [entry.club]))) return true;

  if (entry.carry > 0) {
    return carryToCategory(entry.carry) === skill;
  }

  return false;
}

export function bagEntryMatchesBuilderFocus(entry: BagEntry, focus: BuilderFocus): boolean {
  if (focus === "chipping") return bagEntryMatchesChipping(entry);
  if (focus === "pitching") return bagEntryMatchesPitching(entry);
  return BUILDER_FOCUS_CATEGORIES[focus].some(cat => bagEntryMatchesSkill(entry, cat));
}

/** Club names from the user's profile that match a skill category */
export function getClubsInBagForSkill(skill: SkillCategory, bag: BagEntry[]): string[] {
  return bag
    .filter(e => bagEntryMatchesSkill(e, skill))
    .map(e => e.club);
}

/** Club names from the user's profile that match a builder focus */
export function getClubsInBagForBuilderFocus(focus: BuilderFocus, bag: BagEntry[]): string[] {
  return bag
    .filter(e => bagEntryMatchesBuilderFocus(e, focus))
    .map(e => e.club);
}

export function drillFromBagEntry(
  entry: BagEntry,
  skill: SkillCategory,
  swingLength: SwingLength = "full"
): Drill {
  const category =
    skill === "putting" || skill === "bunker" || skill === "tempo" || skill === "full-swing"
      ? skill
      : carryToCategory(entry.carry);

  if (isPutterClub(entry.club) || entry.carry === 0) {
    return {
      id: `bag-${entry.club.replace(/[\s°()]/g, "-").toLowerCase()}`,
      name: `${entry.club} — Stock`,
      category: "putting",
      club: entry.club,
      distance: "8 ft",
      target: "Center of cup",
      shotShape: "any",
    };
  }

  const { distance, swingLabel, cue } = shotForSwingLength(entry.carry, swingLength);

  return {
    id: `bag-${entry.club.replace(/[\s°()]/g, "-").toLowerCase()}`,
    name: `${entry.club} — ${distance}`,
    category,
    club: entry.club,
    distance,
    target: "Center flag",
    shotShape: "any",
    instructions: `${swingLabel} — ${cue}`,
  };
}

/** Restrict drill pool to profile clubs only; synthesize drills for bag clubs without library entries */
export function poolForSkillAndBag(skill: SkillCategory, bag: BagEntry[]): Drill[] {
  if (bag.length === 0) return [];

  const bagClubs = bag.map(e => e.club);
  let pool = getDrillsByCategory([skill]).filter(d => clubInBag(d.club, bagClubs));

  for (const entry of bag) {
    if (!bagEntryMatchesSkill(entry, skill)) continue;
    if (pool.some(d => clubInBag(d.club, [entry.club]))) continue;
    pool.push(drillFromBagEntry(entry, skill));
  }

  return pool;
}

export function applyBagToDrill(drill: Drill, bag: BagEntry[]): Drill {
  const entry = bag.find(e => clubInBag(drill.club, [e.club]));
  if (!entry) return drill;
  if (isPutterClub(entry.club) || entry.carry === 0) {
    return { ...drill, club: entry.club };
  }
  return { ...drill, club: entry.club, distance: `${entry.carry} yd` };
}
