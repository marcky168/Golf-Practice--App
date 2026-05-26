import type { ClubEntry } from "@/app/actions";

/** Wedges and short clubs typical for chipping games. */
export function isWedgeClub(entry: ClubEntry): boolean {
  const n = entry.club.toLowerCase();
  if (n.includes("°") || n.includes("wedge") || /\b(48|50|52|54|56|58|60|62)\b/.test(n)) return true;
  if (n.includes("pw") || n.includes("pitch") || n.includes("gap") || n.includes("sand") || n.includes("lob")) {
    return true;
  }
  return entry.carry > 0 && entry.carry <= 130;
}

/** Wedges plus short irons for bump-and-run. */
export function isBumpRunClub(entry: ClubEntry): boolean {
  if (isWedgeClub(entry)) return true;
  const n = entry.club.toLowerCase();
  if (/\b(7|8|9)[\- ]?iron\b/.test(n)) return true;
  return entry.carry > 0 && entry.carry <= 145;
}
