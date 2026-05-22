import type { BuilderFocus, SwingLength } from "./types";

export const SWING_LENGTH_OPTIONS: { value: SwingLength; label: string; hint: string }[] = [
  { value: "full", label: "Full", hint: "Stock carry for the club" },
  { value: "three-quarter", label: "3/4", hint: "~75–90% of stock distance" },
  { value: "half", label: "1/2", hint: "~55–75% of stock distance" },
  { value: "random", label: "Mix", hint: "Random partial each rep — great for transfer" },
];

const PITCHING_SWING_OPTIONS = SWING_LENGTH_OPTIONS.filter(o => o.value !== "full");

export function focusSupportsSwingLength(focus: string): boolean {
  return focus === "full-swing" || focus === "pitching";
}

export function getSwingLengthOptionsForFocus(focus: BuilderFocus) {
  if (focus === "pitching") return PITCHING_SWING_OPTIONS;
  return SWING_LENGTH_OPTIONS;
}

export function defaultSwingLengthForFocus(focus: BuilderFocus): SwingLength {
  if (focus === "pitching") return "three-quarter";
  return "full";
}

/** Pitching is partial-swing only — never stock / full */
export function resolveSwingLengthForFocus(
  focus: BuilderFocus,
  swing: SwingLength
): SwingLength {
  if (focus === "pitching" && swing === "full") return "three-quarter";
  return swing;
}

function yardsForPct(carry: number, pct: number): number {
  const min = Math.max(15, Math.round(carry * Math.max(0.4, pct - 0.1) / 5) * 5);
  const max = Math.round(carry * Math.min(1, pct + 0.05) / 5) * 5;
  const steps = Math.max(0, Math.floor((max - min) / 5));
  const offset = steps > 0 ? Math.floor(Math.random() * (steps + 1)) * 5 : 0;
  return min + offset;
}

function randomPartialShotInRange(
  carry: number,
  maxPct: number
): { distance: string; swingLabel: string; cue: string } {
  const maxYards = Math.round(carry * maxPct / 5) * 5;
  const min = Math.max(30, Math.round(carry * 0.5 / 5) * 5);
  const steps = Math.max(0, Math.floor((maxYards - min) / 5));
  const yards = min + Math.floor(Math.random() * (steps + 1)) * 5;
  const pct = yards / carry;

  let swingLabel: string;
  let cue: string;

  if (maxPct >= 0.95 && pct >= 0.9) {
    swingLabel = "Full swing";
    cue = "Normal tempo — commit and finish high";
  } else if (pct >= 0.75) {
    swingLabel = "3/4 swing";
    cue = "Backswing to shoulder height — smooth acceleration through impact";
  } else if (pct >= 0.55) {
    swingLabel = "Half swing";
    cue = "Hands to hip height — quiet lower body, let the club fall";
  } else {
    swingLabel = "Quarter swing";
    cue = "Small backswing — focus on clean contact and pure feel";
  }

  return { distance: `${yards} yd`, swingLabel, cue };
}

/** Random partial distance (existing wedge generator behavior) */
export function randomPartialShot(carry: number): { distance: string; swingLabel: string; cue: string } {
  return randomPartialShotInRange(carry, 1);
}

/** Deterministic or random partial shot from stock carry */
export function shotForSwingLength(
  carry: number,
  swing: SwingLength,
  focus?: BuilderFocus
): { distance: string; swingLabel: string; cue: string } {
  if (carry <= 0) {
    return { distance: "Stock", swingLabel: "Stock", cue: "Smooth tempo" };
  }

  swing = focus ? resolveSwingLengthForFocus(focus, swing) : swing;

  if (swing === "random") {
    return focus === "pitching"
      ? randomPartialShotInRange(carry, 0.88)
      : randomPartialShot(carry);
  }

  const pct = swing === "full" ? 1 : swing === "three-quarter" ? 0.82 : 0.65;
  const yards = swing === "full" ? carry : yardsForPct(carry, pct);

  const swingLabel =
    swing === "full" ? "Full swing" :
    swing === "three-quarter" ? "3/4 swing" : "Half swing";

  const cue =
    swing === "full" ? "Normal tempo — commit and finish high" :
    swing === "three-quarter"
      ? "Backswing to shoulder height — smooth acceleration through impact"
      : "Hands to hip height — quiet lower body, let the club fall";

  return {
    distance: `${yards} yd`,
    swingLabel,
    cue,
  };
}
