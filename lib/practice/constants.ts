import { BuilderFocus, SkillCategory } from "./types";

export const SKILL_CATEGORIES: { value: SkillCategory; label: string }[] = [
  { value: "driver", label: "Driver" },
  { value: "fairway-woods", label: "Fairway Woods / Hybrids" },
  { value: "long-irons", label: "Long Irons (3-6)" },
  { value: "mid-irons", label: "Mid Irons (7-9)" },
  { value: "short-irons", label: "Short Irons (PW-9)" },
  { value: "wedges", label: "Wedges (GW, SW, LW)" },
  { value: "short-game", label: "Short Game (Chips & Pitches)" },
  { value: "putting", label: "Putting" },
  { value: "bunker", label: "Bunker Play" },
  { value: "tempo", label: "Tempo & Rhythm" },
  { value: "full-swing", label: "Full Swing Mechanics" },
];

export const FULL_SWING_FOCUS_CUES = [
  "Smooth tempo — 3:1 backswing to downswing",
  "Low and slow takeaway",
  "Quiet lower body, rotate through",
  "Finish high and balanced",
  "Clubface square to path at impact",
  "Weight stays on left side (for right-handers)",
  "Soft hands, firm left arm",
  "See the target, not the ball",
  "One smooth motion — no hit",
  "Lag the clubhead",
];

export const PUTTING_FOCUS_CUES = [
  "Accelerate through the ball",
  "Keep the putter low and square",
  "Focus on speed, not the line",
  "Eyes directly over the ball",
  "Smooth stroke — no jab",
  "Rock the shoulders, quiet wrists",
  "See the ball go into the hole",
  "Light grip pressure",
];

export const BUNKER_FOCUS_CUES = [
  "Open the clubface",
  "Hit 2 inches behind the ball",
  "Full follow-through",
  "Stay low and wide in the stance",
  "Splash the sand — don’t hit the ball first",
  "Keep the face open through impact",
  "Commit to the swing",
];

export const SHORT_GAME_FOCUS_CUES = [
  "Pick a specific landing spot",
  "Accelerate through the turf",
  "Keep the wrists quiet",
  "Use the bounce of the club",
  "Stay tall through the shot",
  "Let the club do the work",
];

export const PITCHING_FOCUS_CUES = [
  "Distance first — pick the yardage before the swing",
  "3/4 backswing — smooth acceleration",
  "Half swing — hands to hip height",
  "Land it on your spot — ignore the pin",
  "Quiet lower body through impact",
  "Commit to the length — no decel",
];

// Helper to get the right focus cues based on skill
export function getFocusCuesForSkill(skill: SkillCategory): string[] {
  if (skill === "putting") return PUTTING_FOCUS_CUES;
  if (skill === "bunker") return BUNKER_FOCUS_CUES;
  if (skill === "short-game") return SHORT_GAME_FOCUS_CUES;
  return FULL_SWING_FOCUS_CUES;
}

export function getFocusCuesForBuilderFocus(focus: BuilderFocus): string[] {
  if (focus === "putting") return PUTTING_FOCUS_CUES;
  if (focus === "bunker") return BUNKER_FOCUS_CUES;
  if (focus === "chipping") return SHORT_GAME_FOCUS_CUES;
  if (focus === "pitching") return PITCHING_FOCUS_CUES;
  return FULL_SWING_FOCUS_CUES;
}

// Legacy export for backward compatibility
export const FOCUS_CUES = FULL_SWING_FOCUS_CUES;

// Yardage presets that make sense for each skill category
export function getYardagePresetsForSkill(skill: SkillCategory): Array<{ label: string; min: number; max: number }> {
  switch (skill) {
    case "driver":
      return [
        { label: "220–250 yd", min: 220, max: 250 },
        { label: "240–270 yd", min: 240, max: 270 },
        { label: "260–290 yd", min: 260, max: 290 },
        { label: "280+ yd", min: 280, max: 320 },
      ];
    case "fairway-woods":
      return [
        { label: "190–220 yd", min: 190, max: 220 },
        { label: "200–230 yd", min: 200, max: 230 },
        { label: "210–240 yd", min: 210, max: 240 },
      ];
    case "long-irons":
      return [
        { label: "160–185 yd", min: 160, max: 185 },
        { label: "170–195 yd", min: 170, max: 195 },
        { label: "180–210 yd", min: 180, max: 210 },
      ];
    case "mid-irons":
      return [
        { label: "130–155 yd", min: 130, max: 155 },
        { label: "140–165 yd", min: 140, max: 165 },
        { label: "150–175 yd", min: 150, max: 175 },
      ];
    case "short-irons":
      return [
        { label: "100–125 yd", min: 100, max: 125 },
        { label: "110–135 yd", min: 110, max: 135 },
        { label: "120–145 yd", min: 120, max: 145 },
      ];
    case "wedges":
      return [
        { label: "40–65 yd", min: 40, max: 65 },
        { label: "50–80 yd", min: 50, max: 80 },
        { label: "60–100 yd", min: 60, max: 100 },
        { label: "80–110 yd", min: 80, max: 110 },
      ];
    case "short-game":
      return [
        { label: "20–35 yd", min: 20, max: 35 },
        { label: "25–45 yd", min: 25, max: 45 },
        { label: "30–55 yd", min: 30, max: 55 },
      ];
    case "bunker":
      return [
        { label: "8–15 yd", min: 8, max: 15 },
        { label: "12–20 yd", min: 12, max: 20 },
        { label: "15–30 yd", min: 15, max: 30 },
      ];
    case "putting":
      return [
        { label: "3–8 ft", min: 3, max: 8 },
        { label: "6–12 ft", min: 6, max: 12 },
        { label: "10–20 ft", min: 10, max: 20 },
        { label: "15–30 ft", min: 15, max: 30 },
      ];
    default:
      return [
        { label: "100–150 yd", min: 100, max: 150 },
        { label: "140–190 yd", min: 140, max: 190 },
        { label: "180–230 yd", min: 180, max: 230 },
      ];
  }
}

// For Random / Mixed where multiple areas can be selected
export function getYardagePresetsForAreas(areas: SkillCategory[]): Array<{ label: string; min: number; max: number }> {
  if (areas.length === 0) {
    return [
      { label: "100–150 yd", min: 100, max: 150 },
      { label: "140–190 yd", min: 140, max: 190 },
      { label: "180–230 yd", min: 180, max: 230 },
    ];
  }

  // If only one area is selected, use the specific presets for that skill
  if (areas.length === 1) {
    return getYardagePresetsForSkill(areas[0]);
  }

  // Multiple areas selected → show broader useful ranges
  const hasFullSwing = areas.some(a =>
    ["driver", "fairway-woods", "long-irons", "mid-irons", "short-irons"].includes(a)
  );
  const hasWedges = areas.includes("wedges");
  const hasShortGame = areas.includes("short-game");
  const hasPutting = areas.includes("putting");

  const presets: Array<{ label: string; min: number; max: number }> = [];

  if (hasFullSwing) {
    presets.push(
      { label: "120–170 yd", min: 120, max: 170 },
      { label: "150–200 yd", min: 150, max: 200 },
      { label: "180–240 yd", min: 180, max: 240 }
    );
  }

  if (hasWedges || hasShortGame) {
    presets.push(
      { label: "40–80 yd", min: 40, max: 80 },
      { label: "60–110 yd", min: 60, max: 110 }
    );
  }

  if (hasPutting) {
    presets.push(
      { label: "6–15 ft", min: 6, max: 15 },
      { label: "10–25 ft", min: 10, max: 25 }
    );
  }

  // Fallback broad range
  if (presets.length === 0) {
    presets.push(
      { label: "80–150 yd", min: 80, max: 150 },
      { label: "130–200 yd", min: 130, max: 200 }
    );
  }

  return presets;
}

export const REFLECTION_PROMPTS = {
  well: "What felt really good today?",
  improve: "What is the single biggest thing you will work on next session?",
  energy: "How was your energy and focus during the session?",
};

export const DELIBERATE_CHECKLIST = [
  "I picked a very specific target for every shot",
  "I used a consistent pre-shot routine",
  "I gave myself a clear focus cue before each swing",
];
