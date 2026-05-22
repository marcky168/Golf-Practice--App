import {
  clubInBag,
  getClubsInBagForBuilderFocus,
  isHybridClub,
  isNineIronClub,
  isPutterClub,
  isWedgeClubName,
  loftFromClubName,
  loftMatchesBagClub,
  normalizeClubKey,
  resolvePresetClubsToBag,
  type BagEntry,
} from "./bag";
import type { BuilderFocus } from "./types";

export type BlockDrillClubPickInput = {
  id: string;
  focus: BuilderFocus;
  club: string;
  clubs?: string[];
};

const FOCUS_LABELS: Record<BuilderFocus, string> = {
  "full-swing": "full swing",
  pitching: "pitching",
  chipping: "chipping",
  putting: "putting",
  bunker: "bunker",
};

export function focusLabelForPreset(focus: BuilderFocus): string {
  return FOCUS_LABELS[focus];
}

function ironNumberFromName(name: string): number | null {
  const m = name.match(/(\d+)\s*-?\s*iron/i) ?? normalizeClubKey(name).match(/^(\d+)iron$/);
  return m ? parseInt(m[1], 10) : null;
}

function pickMidIron(allowed: string[], hint?: string): string | undefined {
  const hintNum = hint ? ironNumberFromName(hint) : null;
  const irons = allowed
    .map(c => ({ c, n: ironNumberFromName(c) }))
    .filter((x): x is { c: string; n: number } => x.n != null);

  if (hintNum != null) {
    const exact = irons.find(x => x.n === hintNum);
    if (exact) return exact.c;
    if (irons.length) {
      return irons.sort((a, b) => Math.abs(a.n - hintNum) - Math.abs(b.n - hintNum))[0].c;
    }
  }

  const seven = irons.find(x => x.n === 7);
  if (seven) return seven.c;
  return irons.sort((a, b) => a.n - b.n)[Math.floor(irons.length / 2)]?.c;
}

function pickWedge(allowed: string[], hint?: string): string | undefined {
  const wedges = allowed.filter(isWedgeClubName);
  if (!wedges.length) return allowed[0];

  const loftHint = hint?.match(/(\d+)\s*°/);
  if (loftHint) {
    const byLoft = wedges.find(c => loftMatchesBagClub(loftHint[1], c));
    if (byLoft) return byLoft;
  }

  if (hint && clubInBag(hint, wedges)) {
    return wedges.find(c => clubInBag(hint, [c]));
  }

  return [...wedges].sort((a, b) => loftFromClubName(b) - loftFromClubName(a))[0];
}

function pickDriver(allowed: string[], bag: BagEntry[]): string | undefined {
  const drivers = allowed.filter(c => /driver/i.test(c));
  if (drivers.length) return drivers[0];

  const woods = allowed
    .map(c => ({ c, carry: bag.find(e => e.club === c)?.carry ?? 0 }))
    .filter(x => /wood|hybrid/i.test(x.c) || x.carry >= 200)
    .sort((a, b) => b.carry - a.carry);
  return woods[0]?.c ?? allowed[0];
}

/**
 * Always builds from the user's profile bag. Preset `club` is only a preference hint.
 */
export function pickClubsForBlockDrillPreset(
  preset: BlockDrillClubPickInput,
  bag: BagEntry[]
): string[] {
  if (bag.length === 0) return [];

  if (preset.clubs?.length) {
    const explicit = resolvePresetClubsToBag(preset.clubs, bag);
    if (explicit.length > 0) return explicit;
  }

  const allowed = getClubsInBagForBuilderFocus(preset.focus, bag);
  if (allowed.length === 0) return [];

  const preferred = preset.club ? resolvePresetClubsToBag([preset.club], bag) : [];
  if (preferred.length > 0) return preferred;

  if (preset.id === "pitch-multi-club-30") {
    const wedges = allowed.filter(c => isWedgeClubName(c) || clubInBag("pw", [c]));
    if (wedges.length >= 2) return wedges;
    if (wedges.length === 1) return wedges;
    return allowed.length >= 2 ? allowed.slice(0, Math.min(4, allowed.length)) : [allowed[0]];
  }

  if (preset.focus === "putting") {
    return [allowed.find(c => isPutterClub(c)) ?? allowed[0]];
  }

  if (/driver/i.test(preset.club)) {
    const d = pickDriver(allowed, bag);
    return d ? [d] : [allowed[0]];
  }

  if (/iron/i.test(preset.club)) {
    const iron = pickMidIron(allowed, preset.club);
    return iron ? [iron] : [allowed[0]];
  }

  if (preset.focus === "bunker" || preset.club.includes("°") || isWedgeClubName(preset.club)) {
    const w = pickWedge(allowed, preset.club);
    return w ? [w] : [allowed[0]];
  }

  if (preset.focus === "chipping") {
    const chip =
      allowed.find(c => clubInBag("pw", [c])) ??
      allowed.find(c => isWedgeClubName(c)) ??
      allowed.find(c => isNineIronClub(c)) ??
      allowed.find(c => isHybridClub(c)) ??
      allowed[0];
    return [chip];
  }

  if (preset.focus === "pitching") {
    const w = pickWedge(allowed, preset.club);
    return w ? [w] : [allowed[0]];
  }

  return [allowed[0]];
}
