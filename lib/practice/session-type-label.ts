import { SKILL_CATEGORIES } from "./constants";
import { GAMES } from "./games";
import type { BuilderFocus, SessionConfig, SkillCategory } from "./types";

const BUILDER_FOCUS_LABELS: Record<BuilderFocus, string> = {
  "full-swing": "Full Swing",
  chipping: "Chipping",
  pitching: "Pitching",
  putting: "Putting",
  bunker: "Bunker",
};

function skillCategoryLabel(cat: SkillCategory): string {
  const match = SKILL_CATEGORIES.find(c => c.value === cat);
  if (!match) return cat.replace(/-/g, " ");
  // Drop parenthetical detail for stat bucketing — still readable
  return match.label.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function bunkerFocusLabel(cfg: SessionConfig): string {
  if (cfg.bunkerType === "fairway") return "Fairway Bunker";
  if (cfg.bunkerType === "greenside") return "Greenside Bunker";
  return "Bunker";
}

function focusAreasSummary(areas: SkillCategory[]): string {
  if (areas.length === 0) return "Practice";
  if (areas.length === 1) return skillCategoryLabel(areas[0]);
  if (areas.length >= 4) return "Full Bag";
  return areas.map(skillCategoryLabel).join(" · ");
}

/** Skill / focus extracted from saved session — used for stats bucketing */
export function practiceFocusLabel(session: {
  type: string;
  title?: string | null;
  config?: unknown;
}): string {
  if (session.type === "game") {
    const gameId = (session.config as { gameId?: string } | null)?.gameId;
    const game = gameId ? GAMES.find(g => g.id === gameId) : undefined;
    if (game) return game.name;
    return "Games";
  }

  const cfg = session.config as SessionConfig | null | undefined;

  if (cfg?.builderFocus) {
    if (cfg.builderFocus === "bunker") return bunkerFocusLabel(cfg);
    return BUILDER_FOCUS_LABELS[cfg.builderFocus];
  }

  if (cfg?.focusAreas?.length) {
    return focusAreasSummary(cfg.focusAreas);
  }

  if (session.title) {
    return titleToFocusLabel(session.title);
  }

  if (session.type === "random") return "Random";
  if (session.type === "mixed") return "Mixed";
  return "Practice";
}

/** Parse legacy / title-only sessions when config fields are missing */
function titleToFocusLabel(title: string): string {
  const t = title.trim();

  if (/greenside bunker/i.test(t)) return "Greenside Bunker";
  if (/fairway bunker/i.test(t)) return "Fairway Bunker";
  if (/chipping/i.test(t)) return "Chipping";
  if (/pitching/i.test(t)) return "Pitching";
  if (/putting|putt/i.test(t)) return "Putting";
  if (/bunker/i.test(t)) return "Bunker";
  if (/full[- ]?bag|full swing/i.test(t)) return "Full Swing";

  const clubMatch = t.match(/^Block:\s*(.+?)\s*—/i);
  if (clubMatch) return clubMatch[1].trim();

  if (/^random/i.test(t)) {
    const inner = t.replace(/^random\s+/i, "").split("·")[0]?.trim();
    if (inner) return `Random · ${inner}`;
    return "Random";
  }

  if (/^mixed/i.test(t)) return "Mixed";

  // "Block Chipping · 3×10" → Chipping already caught; fallback shorten
  const beforeDot = t.split("·")[0]?.trim();
  return beforeDot?.replace(/^block\s*→?\s*random\s*/i, "")
    .replace(/^block\s*/i, "")
    .trim() || "Practice";
}

/**
 * Human-readable session label (history, detail views).
 * Includes format when it adds context (Random, Mixed).
 */
export function practiceModeLabel(session: {
  type: string;
  title?: string | null;
  config?: unknown;
}): string {
  if (session.type === "game") {
    return practiceFocusLabel(session);
  }

  const focus = practiceFocusLabel(session);
  const cfg = session.config as SessionConfig | null | undefined;

  if (session.type === "random") {
    return focus.startsWith("Random") ? focus : `Random · ${focus}`;
  }
  if (session.type === "mixed") {
    return focus === "Mixed" || focus === "Full Bag" ? "Mixed · Full Bag" : `Mixed · ${focus}`;
  }
  if (session.type === "block" && cfg?.practiceMode === "transition") {
    return `${focus} · Block → Random`;
  }
  if (session.type === "block" && cfg?.practiceMode === "random") {
    return `${focus} · Random blocks`;
  }

  return focus;
}
