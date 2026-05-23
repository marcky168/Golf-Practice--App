import { SessionConfig } from "./types";
import {
  createBlockConfig,
  generateRandomSessionWithWarmup,
  generateMixedSession,
} from "./generators";
import { SkillCategory } from "./types";

/**
 * Curated, high-quality pre-built sessions the user can start with one tap.
 * These are the "I don't know what to do today" lifesavers.
 */
export const PREBUILT_TEMPLATES: Array<{
  id: string;
  label: string;
  description: string;
  duration: number;
  /** Returns null when the template requires a user bag that isn't available */
  configFactory: () => SessionConfig | null;
}> = [
  {
    id: "iron-precision",
    label: "Iron Precision 45",
    description: "Mid-iron block warm-up followed by random mid + short iron targets",
    duration: 45,
    configFactory: () => generateMixedSession({ durationMinutes: 45, focusAreas: ["mid-irons", "short-irons", "wedges"] }),
  },
  {
    id: "wedge-wizard",
    label: "Wedge Wizard 35",
    description: "Pure wedge distance & trajectory control — mostly random",
    duration: 35,
    configFactory: () =>
      generateRandomSessionWithWarmup({ durationMinutes: 35, focusAreas: ["wedges", "short-game"] }),
  },
  {
    id: "short-game-scramble",
    label: "Short Game Scramble 30",
    description: "Realistic up-and-down practice from every lie",
    duration: 30,
    configFactory: () =>
      generateRandomSessionWithWarmup({
        durationMinutes: 30,
        focusAreas: ["short-game", "putting", "bunker"],
      }),
  },
  {
    id: "driver-control",
    label: "Driver Control Block",
    description: "12 focused driver swings with varying shapes and targets",
    duration: 20,
    configFactory: () => createBlockConfig({ skill: "driver", reps: 12, focusCue: "Smooth tempo — finish balanced" }),
  },
  {
    id: "putting-ladder",
    label: "Putting Ladder 25",
    description: "Progressive lag + short pressure putting",
    duration: 25,
    configFactory: () =>
      generateRandomSessionWithWarmup({ durationMinutes: 25, focusAreas: ["putting"] }),
  },
  {
    id: "full-bag-random-60",
    label: "Full Bag Random 60",
    description: "The gold standard — simulates a full round on the range",
    duration: 60,
    configFactory: () =>
      generateRandomSessionWithWarmup({
        durationMinutes: 60,
        focusAreas: ["driver", "mid-irons", "wedges", "short-game", "putting"],
      }),
  },
];
