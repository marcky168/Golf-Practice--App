/** Spoken + on-screen cues during the 10s micro-pause (20× neural replay gap) */
export const MICRO_PAUSE_SECONDS = 10;

export const MICRO_PAUSE_SCRIPT: Record<number, string> = {
  10: "Freeze. Eyes soft. Replay the swing you just hit.",
  8: "Your motor cortex replays it twenty times faster. Feel the contact.",
  5: "Same tempo. Same target. Standing still counts as a rep.",
  3: "One clean mental replay.",
  1: "Ready.",
};

export function microPausePromptForSecond(secondsLeft: number): string | null {
  return MICRO_PAUSE_SCRIPT[secondsLeft] ?? null;
}
