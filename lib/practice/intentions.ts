import type { BuilderPracticeMode, Drill, SkillCategory } from "./types";

export const SHOT_SHAPES = ["Draw", "Straight", "Fade"] as const;
export const SHOT_TRAJECTORIES = ["High", "Medium", "Low"] as const;

export type ShotShape = (typeof SHOT_SHAPES)[number];
export type ShotTrajectory = (typeof SHOT_TRAJECTORIES)[number];
export type ShotIntention = { shape: ShotShape; trajectory: ShotTrajectory };

export function randomShotIntention(): ShotIntention {
  return {
    shape: SHOT_SHAPES[Math.floor(Math.random() * SHOT_SHAPES.length)],
    trajectory: SHOT_TRAJECTORIES[Math.floor(Math.random() * SHOT_TRAJECTORIES.length)],
  };
}

export function blockUsesRandomMode(
  blockIndex: number,
  numBlocks: number,
  mode: BuilderPracticeMode
): boolean {
  if (mode === "random") return true;
  if (mode === "block") return false;
  const transitionAt = Math.ceil(numBlocks / 2);
  return blockIndex >= transitionAt;
}

export function repUsesRandomIntention(
  repIndex: number,
  practiceMode: BuilderPracticeMode | undefined,
  ballsPerBlock: number,
  numBlocks: number
): boolean {
  if (!practiceMode || practiceMode === "block") return false;
  if (practiceMode === "random") return true;
  if (practiceMode === "transition" && ballsPerBlock > 0 && numBlocks > 0) {
    const blockIndex = Math.floor(repIndex / ballsPerBlock);
    return blockUsesRandomMode(blockIndex, numBlocks, practiceMode);
  }
  return false;
}

function skipIntentionForCategory(category: SkillCategory): boolean {
  return category === "putting" || category === "bunker";
}

/** One intention per rep; null = use session fixed intention (block / transition前半) */
export function buildPerRepIntentions(
  drills: Drill[],
  practiceMode: BuilderPracticeMode,
  ballsPerBlock: number,
  numBlocks: number
): (ShotIntention | null)[] | undefined {
  let anyRandom = false;

  const intentions = drills.map((drill, i) => {
    if (skipIntentionForCategory(drill.category)) return null;
    if (!repUsesRandomIntention(i, practiceMode, ballsPerBlock, numBlocks)) return null;
    anyRandom = true;
    return randomShotIntention();
  });

  return anyRandom ? intentions : undefined;
}
