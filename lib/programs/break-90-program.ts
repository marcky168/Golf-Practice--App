import type { Program, ProgramWarmup } from "./types";

/**
 * Phases 5–6 hit full shots off the tee (driver, long irons), so they need a
 * fuller mobility + ramp-up warm-up than the putting/short-game default.
 */
const FULL_SWING_WARMUP: ProgramWarmup = {
  totalDuration: "10–12 min",
  blocks: [
    {
      duration: "3 min",
      description:
        "Mobility — T-spine rotations, hip circles, 10 slow air-swings each side. Loosen before you load.",
    },
    {
      duration: "4 min",
      description:
        "Ramp-up swings — wedge → 7-iron → driver, 3 balls each building 60% → full. Feel tempo, not distance.",
    },
    {
      duration: "3 min",
      description:
        "Routine rehearsal — 5 full pre-shot routines: name where you can NOT go, pick the fat-side target, commit 10/10, swing.",
    },
  ],
};

/**
 * Break 90 — Scoring Method program.
 *
 * Built on the "two games per hole" system: ① get inside the scoring zone
 * (100 yds) in regulation, ② get down in 3 from there. Bogey golf breaks 90;
 * doubles and triples from bad decisions are what kill scores — not bad swings.
 *
 * Phases work backwards through the Gears: Gear 4 (green) → Gear 3 (inside 25)
 * → Gear 2 (inside 50) → Gear 1 (inside 100) → position game → integration.
 * Source: Jerome Rufin "10 Rules to Break 90" (coach Will's scoring method).
 */
export const BREAK_90_PROGRAM: Program = {
  id: "break-90-program",
  name: "Break 90 — Scoring Method",
  shortDescription: "Two games per hole: reach the scoring zone, get down in 3. No swing changes.",
  fullDescription:
    "A course-management and short-game program built on the Scoring Method: every hole is two separate games — get inside 100 yds in regulation, then get down in 3. All bogeys breaks 90 before a single par drops. Phases climb the Gears from the green outwards, because lag putting makes up for every other sin. Same Huberman fast-learning protocol as the Driver Program: cue cards, deliberate-error contrasts, pressure gates, idle-rest consolidation.",
  estimatedWeeks: { min: 6, max: 10 },

  warmup: {
    totalDuration: "8–10 min",
    blocks: [
      {
        duration: "3 min",
        description:
          "Speed calibration — 6 lag putts to a fringe or towel at 20 / 30 / 40 ft. Feel before mechanics.",
      },
      {
        duration: "3 min",
        description:
          "Short-game feels — 5 chips landing on a spot, 5 half-wedges at 50%. No target score yet.",
      },
      {
        duration: "3 min",
        description:
          "Routine rehearsal — 5 full pre-shot routines with any club: pick where you can NOT go, see the target, commit 10/10, swing.",
      },
    ],
  },

  defineGoodShot: {
    criteria: [
      "Putting: lag finishes inside 3 ft (tap-in circle), or makeable putt holed",
      "Chip/pitch: ball finishes inside the two-putt circle (~6 ft short game, ~30 ft wedges)",
      "Full shot: committed 10/10 to a target picked with 'where can I not go?' — outcome on the safe side of the miss",
    ],
    scoring: "A good rep = the gear objective achieved WITH full commitment. Great swing + no commitment = miss.",
  },

  weeklySchedule: [
    { day: "Mon", activity: "Full session (current phase)" },
    { day: "Tue", activity: "Light — 15 min lag putting ladder only" },
    { day: "Wed", activity: "Full session (current phase)" },
    { day: "Thu", activity: "Off or 5 min visualising the two games on your home course" },
    { day: "Fri", activity: "Full session (current phase)" },
    { day: "Sat", activity: "On-course — score ONLY the two games per hole: zone in regulation? down in 3?" },
    { day: "Sun", activity: "Off (full rest = consolidation)" },
  ],

  phases: [
    // ── Phase 1 — Gear 4: the green ─────────────────────────────────────────
    {
      id: "gear-4-lag-putting",
      number: "1",
      name: "Gear 4 — Lag Putting Is Everything",
      skillFocus: "Speed control + no three-putts",
      estimatedSessions: { min: 3, max: 5 },
      cueCard: {
        cue: "Speed makes up for all the sins.",
        feel: "Roll it dead-weight into a 3-ft circle. The hole is a bonus.",
      },
      notes: [
        "Rule 5: blade a chip → nice two putt. Chunk a chip → nice two putt. Lag putting rescues every other mistake.",
        "Rule 10: if you use a line on the ball, use it every single time. One routine, ~12 seconds, identical.",
      ],
      compileDrills: [
        {
          id: "lag-ladder-game",
          name: "Lag Putting Ladder",
          description: "Scored game — 20 / 30 / 40 ft lags into the tap-in circle. Beat your last score by 1.",
          gameId: "lag-putting-ladder",
        },
        {
          id: "lag-to-tap-in-game",
          name: "Lag to Tap-in",
          description: "Scored game — lag + finish. The full 'down in 2' rep.",
          gameId: "lag-to-tap-in",
        },
        {
          id: "pressure-make-ladder",
          name: "Pressure make ladder",
          description:
            "10 in a row at 3 ft → move to 3.5 ft → 4 ft → 4.5 ft → 5 ft. Miss = restart the distance. Back off any putt you're not 10/10 committed to.",
          gameId: "makeable-putt-ladder",
        },
        {
          id: "deliberate-error-decel",
          name: "Deliberate error contrast",
          description: "3 lags hitting AT the hole with no speed picture → 3 rolling dead-weight to the circle. Feel the difference.",
          hasDeliberateError: true,
        },
        {
          id: "routine-clock",
          name: "Routine clock",
          description: "10 putts, identical routine, ~12 seconds each. Rushing on the green and crawling over 3-footers both break under pressure.",
          reps: 10,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate: "Speed makes up for the sins. Today my lag feel was ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "80% of lags finish inside the tap-in circle, two sessions running",
        requiredGoodPct: 80,
        requiredConsecutiveSessions: 2,
        gameGate: { gameId: "lag-putting-ladder", targetScore: 48, requiredSessions: 2 },
      },
    },

    // ── Phase 2 — Gear 3: inside 25 yds ─────────────────────────────────────
    {
      id: "gear-3-inside-25",
      number: "2",
      name: "Gear 3 — Inside 25: Get It Rolling",
      skillFocus: "Boring chips into the two-putt circle",
      estimatedSessions: { min: 3, max: 5 },
      cueCard: {
        cue: "Don't be a hero.",
        feel: "Lowest-lofted club that works, land it on the spot, let it release.",
      },
      notes: [
        "Rule 8: you can't win a hole with one chip, but you can lose it with one flop.",
        "Down in 3 from here means: boring chip inside 6 ft, two putts maximum.",
      ],
      compileDrills: [
        {
          id: "up-and-down-game",
          name: "Up & Down",
          description: "Scored game — the full 'down in 3' rep from short range.",
          gameId: "up-and-down",
        },
        {
          id: "bump-and-run-game",
          name: "Bump & Run Blitz",
          description: "Scored game — the boring, repeatable shot that beats the flop every time.",
          gameId: "bump-and-run-blitz",
        },
        {
          id: "chip-ladder-game",
          name: "Chip Ladder",
          description: "Scored game — distance control across the gear.",
          gameId: "chip-ladder",
        },
        {
          id: "deliberate-error-hero",
          name: "Deliberate error contrast",
          description: "3 hero flops at a tight pin → 3 bump-and-runs to the fat side. Watch which finishes closer.",
          hasDeliberateError: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate: "Don't be a hero. The boring shot finished ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "70% of chips inside the two-putt circle (~6 ft), two sessions running",
        requiredGoodPct: 70,
        requiredConsecutiveSessions: 2,
        gameGate: { gameId: "up-and-down", targetScore: 4, requiredSessions: 2 },
      },
    },

    // ── Phase 3 — Gear 2: inside 50 yds ─────────────────────────────────────
    {
      id: "gear-2-inside-50",
      number: "3",
      name: "Gear 2 — Inside 50: Land It on the Number",
      skillFocus: "Pitch distance control",
      estimatedSessions: { min: 3, max: 5 },
      cueCard: {
        cue: "Pick the landing spot, not the pin.",
        feel: "Smooth half-swing, ball lands on the towel, releases to the circle.",
      },
      compileDrills: [
        {
          id: "pitch-ladder-game",
          name: "Pitch Ladder",
          description: "Scored game — climbing distances inside 50.",
          gameId: "pitch-ladder",
        },
        {
          id: "landing-zone-game",
          name: "Landing Zone 8",
          description: "Scored game — landing spot discipline over pin hunting.",
          gameId: "landing-zone-8",
        },
        {
          id: "deliberate-error-pin-hunt",
          name: "Deliberate error contrast",
          description: "3 pitches aimed dead at a tight pin → 3 at the fat-side landing spot. Compare leave quality.",
          hasDeliberateError: true,
        },
        {
          id: "random-insert-distances",
          name: "Random insert — distance shuffle",
          description: "Every 4th ball, call a new number (25 / 35 / 50). No two consecutive the same.",
          randomInsert: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate: "Landing spot, not pin. My 50-yd number felt ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "70% of pitches finish inside the two-putt circle, two sessions running",
        requiredGoodPct: 70,
        requiredConsecutiveSessions: 2,
        gameGate: { gameId: "pitch-ladder", targetScore: 42, requiredSessions: 2 },
      },
    },

    // ── Phase 4 — Gear 1: inside 100 yds ────────────────────────────────────
    {
      id: "gear-1-inside-100",
      number: "4",
      name: "Gear 1 — Inside 100: The Scoring Zone",
      skillFocus: "Wedge distance windows",
      estimatedSessions: { min: 3, max: 5 },
      cueCard: {
        cue: "Get down in 3 from here.",
        feel: "Wedge to the 30-ft window, lag, tap in. That's a win — every time.",
      },
      notes: [
        "This is the zone the whole position game feeds. 18 times around, be inside the 100.",
      ],
      compileDrills: [
        {
          id: "wedge-window-game",
          name: "Wedge Window 6",
          description: "Scored game — hitting the window, not the flag.",
          gameId: "wedge-window-6",
        },
        {
          id: "pin-high-game",
          name: "Pin High 8",
          description: "Scored game — distance first, line second.",
          gameId: "pin-high-8",
        },
        {
          id: "down-in-3-sim",
          name: "Down-in-3 simulation",
          description:
            "10 reps: call a number 60–100, hit the wedge, then honestly judge — from where it finished, do you get down in 2 putts? Rate the rep on the whole 3-shot outcome.",
          reps: 10,
        },
        {
          id: "deliberate-error-flag-hunt",
          name: "Deliberate error contrast",
          description: "3 wedges fired at the flag → 3 at centre-of-window. Contrast where the misses end up.",
          hasDeliberateError: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate: "From 100 in, I get down in 3. My window rate was ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "70% of wedges inside the 30-ft window, two sessions running",
        requiredGoodPct: 70,
        requiredConsecutiveSessions: 2,
        gameGate: { gameId: "wedge-window-6", targetScore: 4, requiredSessions: 2 },
      },
    },

    // ── Phase 5 — position game ─────────────────────────────────────────────
    {
      id: "position-game",
      number: "5",
      name: "Position Game — Get to the Zone",
      skillFocus: "Club-down decisions off the tee and into the zone",
      estimatedSessions: { min: 3, max: 5 },
      warmup: FULL_SWING_WARMUP,
      cueCard: {
        cue: "Where can I absolutely NOT go?",
        feel: "Boring clubs, fat targets. 4-iron + wedge beats two hero 7-irons.",
      },
      notes: [
        "Rules 1, 2, 8: don't start aggressive, don't play the popular line, don't be a hero. You shot 84 because you lost six balls — not because of your swing.",
        "Game ① on every simulated hole: inside 100 yds in regulation (par 4 = two shots).",
      ],
      compileDrills: [
        {
          id: "arena-3-hole-position",
          name: "3-Hole Arena — position scoring",
          description:
            "Scored game. Play each hole asking only: did I reach the scoring zone in regulation? Club down off every tee.",
          gameId: "arena-3-hole",
        },
        {
          id: "not-go-routine",
          name: "'Can't go' pre-shot reps",
          description:
            "15 full shots. Before each: name aloud where you can NOT go, pick the fat-side target, commit 10/10. Rate commitment, not contact.",
          reps: 15,
        },
        {
          id: "deliberate-error-hero-line",
          name: "Deliberate error contrast",
          description: "3 driver-at-the-trouble hero lines → 3 boring-club fat-side lines. Score both as 'zone in regulation?'.",
          hasDeliberateError: true,
        },
        {
          id: "random-insert-hole-shapes",
          name: "Random insert — hole shapes",
          description: "Alternate imaginary holes: OB left, water right, tight, wide. New 'can't go' answer every time.",
          randomInsert: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 10,
        verbalRecapTemplate: "Where I couldn't go decided the club. Zone in regulation on ___ of my holes.",
        preSleepVisualization: true,
      },
      gate: {
        description: "Scoring zone in regulation on 2 of 3 arena holes, two sessions running",
        requiredGoodPct: 66,
        requiredConsecutiveSessions: 2,
        gameGate: { gameId: "arena-3-hole", targetScore: 4, requiredSessions: 2 },
      },
    },

    // ── Phase 6 — integration ───────────────────────────────────────────────
    {
      id: "integration-pressure",
      number: "6",
      name: "Integration — Train Hard, Play Easy",
      skillFocus: "Both games under pressure, target-score progression",
      estimatedSessions: { min: 6, max: 12 },
      warmup: FULL_SWING_WARMUP,
      cueCard: {
        cue: "10/10 commitment or back off.",
        feel: "Process, not outcome. The shot in front of you is the only one that exists.",
      },
      notes: [
        "Rules 3, 4, 7, 9, 10: take away the score, stay present, train hard, fully commit, practice makes permanence.",
        "Target-score progression: whatever you scored last time, today's target is that plus one. Hit 8? The bar is 9.",
        "On course: score ONLY the two games per hole. The number takes care of itself.",
      ],
      compileDrills: [
        {
          id: "pressure-5-game",
          name: "Pressure 5",
          description: "Scored game under consequence. Beat your previous score by 1 — that IS the drill.",
          gameId: "pressure-5",
        },
        {
          id: "arena-3-hole-full",
          name: "3-Hole Arena — both games scored",
          description: "Scored game. Each hole: zone in regulation? down in 3? Full pre-shot routine, every shot.",
          gameId: "arena-3-hole",
        },
        {
          id: "stakes-drill",
          name: "Stakes drill",
          description: "Miss your target score → 10 push-ups before packing up. Mild stress = faster learning.",
        },
        {
          id: "commit-contrast",
          name: "Deliberate error contrast",
          description: "3 shots at 6/10 commitment (hit and hope) → 3 backed-off-and-recommitted at 10/10.",
          hasDeliberateError: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 10,
        verbalRecapTemplate: "Committed 10/10 on ___. Lost the process on ___. Next round I score only the two games.",
        preSleepVisualization: true,
      },
      gate: {
        description: "Integration phase — ongoing. Re-run the 3-Hole Arena benchmark every 2 weeks and raise the target by 1.",
      },
    },
  ],
};
