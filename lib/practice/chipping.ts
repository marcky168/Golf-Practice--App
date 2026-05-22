import type { SwingLength } from "./types";

/** Chipping = greenside shots, never longer than a short pitch */
export const CHIPPING_MAX_YARDS = 30;
export const CHIPPING_TYPICAL_YARDS = 25;

export function parseYardsFromDistance(distance: string): number {
  const distStr = distance.toLowerCase();
  if (distStr.includes("full")) return 999;
  if (distStr.includes("ft")) {
    const ft = parseFloat(distStr);
    return ft * 0.333;
  }
  const match = distStr.match(/(\d+)(?:-(\d+))?/);
  if (!match) return 0;
  const low = parseInt(match[1], 10);
  const high = match[2] ? parseInt(match[2], 10) : low;
  return (low + high) / 2;
}

export function drillWithinChippingRange(distance: string): boolean {
  const yards = parseYardsFromDistance(distance);
  return yards > 0 && yards <= CHIPPING_MAX_YARDS;
}

function pickYards(min: number, max: number): number {
  const lo = Math.max(5, Math.round(min / 5) * 5);
  const hi = Math.min(CHIPPING_MAX_YARDS, Math.round(max / 5) * 5);
  const steps = Math.max(0, Math.floor((hi - lo) / 5));
  return lo + Math.floor(Math.random() * (steps + 1)) * 5;
}

/** Distances and cues scoped to ≤30 yd — varies each rep (no swing-length picker) */
export function shotForChipping(swing: SwingLength = "random"): {
  distance: string;
  swingLabel: string;
  cue: string;
} {
  if (swing === "random") {
    const yards = pickYards(10, CHIPPING_MAX_YARDS);
    const pct = yards / CHIPPING_MAX_YARDS;
    if (pct >= 0.85) {
      return {
        distance: `${yards} yd`,
        swingLabel: "Firm chip",
        cue: "Landing spot first — let it release to the hole",
      };
    }
    if (pct >= 0.6) {
      return {
        distance: `${yards} yd`,
        swingLabel: "Standard chip",
        cue: "Quiet wrists — brush the turf after the ball",
      };
    }
    return {
      distance: `${yards} yd`,
      swingLabel: "Delicate chip",
      cue: "Soft hands — minimum airtime",
    };
  }

  if (swing === "full") {
    const yards = pickYards(22, CHIPPING_MAX_YARDS);
    return {
      distance: `${yards} yd`,
      swingLabel: "Firm chip",
      cue: "Pick a landing spot — trust the rollout",
    };
  }

  if (swing === "three-quarter") {
    const yards = pickYards(18, 28);
    return {
      distance: `${yards} yd`,
      swingLabel: "3/4 chip",
      cue: "Backswing to hip height — accelerate through",
    };
  }

  const yards = pickYards(10, 22);
  return {
    distance: `${yards} yd`,
    swingLabel: "Half chip",
    cue: "Small motion — land it on your spot",
  };
}
