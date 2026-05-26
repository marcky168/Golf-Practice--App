import type { Program } from "./types";

/**
 * Driver Program — TPI setup + fast-learning protocol.
 *
 * 7 phases, each built around: cue card, compile drills (with deliberate
 * errors and metronome), consolidate routine, gate criteria.
 * Source: user-provided TPI Driver Setup + Fast-Learning Protocol.
 */
export const DRIVER_PROGRAM: Program = {
  id: "driver-program",
  name: "Driver Program",
  shortDescription: "TPI setup + fast-learning protocol for driver, 3W, 3H",
  fullDescription:
    "Multi-phase program built on Huberman motor-learning principles and the MITmonk 3C protocol (Compress → Compile → Consolidate). Each phase has a cue card, deliberate-error contrasts, metronome work, and idle-rest consolidation. Phases are strictly gated by a self-rated good-shot rate.",
  estimatedWeeks: { min: 5, max: 8 },

  warmup: {
    totalDuration: "8–10 min",
    blocks: [
      {
        duration: "3 min",
        description:
          "Mobility — T-spine open books 10/side, hip 90/90 transitions 5/side, trail-shoulder external rotation with band 15 reps",
      },
      {
        duration: "3 min",
        description:
          "Movement prep — 10 rotational squats, 10 step-throughs with a club, 10 pump drills",
      },
      {
        duration: "3 min",
        description:
          "Dynamic swings — 5 left-handed swings (cross-pattern activation), 10 progressive 7-irons at 50 / 70 / 90 %",
      },
    ],
  },

  defineGoodShot: {
    criteria: [
      "Contact: face strike within a ball-width of centre",
      "Flight: starts on aim ± 10 yds at apex, no balloon",
      "Start line: within 5° for first 30 yds",
    ],
    scoring: "3/3 = good. 2/3 = 0.5. 1/3 = miss.",
  },

  weeklySchedule: [
    { day: "Mon", activity: "Full session (current phase)" },
    { day: "Tue", activity: "Light — 10 min visualisation + 10 slow swings, no balls" },
    { day: "Wed", activity: "Full session (current phase)" },
    { day: "Thu", activity: "Off or 5 min mental rehearsal only" },
    { day: "Fri", activity: "Full session (current phase)" },
    { day: "Sat", activity: "On-course or sim, current phase cues only" },
    { day: "Sun", activity: "Off (full rest = consolidation)" },
  ],

  phases: [
    // ── Phase 1 ──────────────────────────────────────────────────────────────
    {
      id: "phase-1",
      number: "1",
      name: "Setup & Posture — Irons Baseline",
      skillFocus: "Postural setup repeatability",
      estimatedSessions: { min: 2, max: 3 },
      cueCard: {
        cue: "Tilt and tall.",
        feel: "Right shoulder lower, hands hang under chin.",
      },
      compileDrills: [
        {
          id: "perfector-setup",
          name: "Perfector setup reps",
          description: "7-iron, 50 reps. Metronome at 50 BPM for setup checkpoints.",
          reps: 50,
          metronomeBPM: 50,
        },
        {
          id: "chair-drill",
          name: "Chair drill",
          description: "Sit-into-stance chair drill — 20 reps.",
          reps: 20,
        },
        {
          id: "deliberate-error-posture",
          name: "Deliberate error contrast",
          description: "3 swings with terrible posture → 3 correct. Feel the contrast wire the new pattern.",
          hasDeliberateError: true,
        },
        {
          id: "video-face-on-dtl",
          name: "Video face-on + down-the-line",
          description: "Record yourself and check setup on both angles.",
          videoCheck: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate: "Setup is tilt and tall. Today I felt ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "80% setup feel across two sessions running",
        requiredGoodPct: 80,
        requiredConsecutiveSessions: 2,
      },
    },

    // ── Phase 1.5 ────────────────────────────────────────────────────────────
    {
      id: "phase-1-5",
      number: "1.5",
      name: "Driver-Specific Setup",
      skillFocus: "Driver setup geometry (TPI)",
      estimatedSessions: { min: 2, max: 3 },
      cueCard: {
        cue: "Lead hip up, load the back.",
        feel: "Trail heel pressed, lead shoulder high, ready to uppercut.",
      },
      notes: [
        "Five elements: ball off lead heel (tee half-ball above crown); spine tilt away from target 8–12°; lead hip higher than trail hip; pressure 55–60% on trail side; stance wider than irons.",
        "No full swings yet — setup work only.",
      ],
      compileDrills: [
        {
          id: "mirror-reps",
          name: "Mirror reps",
          description: "30 reps in a mirror, checking all five TPI elements.",
          reps: 30,
        },
        {
          id: "pressure-scale",
          name: "Pressure scale drill",
          description: "Two bathroom scales (or feel-based): toes light on lead, heel pressed on trail.",
        },
        {
          id: "shaft-across-shoulders",
          name: "Shaft-across-shoulders tilt check",
          description: "Lead end of shaft points behind the ball — confirms secondary tilt.",
        },
        {
          id: "static-hold",
          name: "Static hold",
          description: "10 reps × 10 seconds. Step away between each. Build address-position muscle memory.",
          reps: 10,
        },
        {
          id: "deliberate-error-tpi",
          name: "Deliberate error contrast",
          description: "3 setups with level hips and tall spine (your old default) → 3 correct TPI setups. Contrast wires the new pattern.",
          hasDeliberateError: true,
        },
        {
          id: "perfector-driver-address",
          name: "Perfector driver address reps",
          description: "30 reps with driver in address.",
          reps: 30,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate: "Lead hip up. Load the back. The uppercut is set.",
        preSleepVisualization: true,
      },
      gate: {
        description: "All five TPI elements check on video across two sessions running",
        requiredConsecutiveSessions: 2,
        requiresVideoConfirmation: true,
      },
    },

    // ── Phase 2 ──────────────────────────────────────────────────────────────
    {
      id: "phase-2",
      number: "2",
      name: "Backswing Structure",
      skillFocus: "Trail arm external rotation + connection",
      estimatedSessions: { min: 4, max: 6 },
      cueCard: {
        cue: "Elbow down, palm to sky.",
        feel: "Trail elbow points at the ground, right palm catches rain.",
      },
      compileDrills: [
        {
          id: "perfector-backswing-pauses",
          name: "Perfector backswing pauses",
          description: "30 reps. Pause and check the trail elbow + palm position at the top.",
          reps: 30,
        },
        {
          id: "towel-armpit",
          name: "Towel under trail armpit",
          description: "20 reps. Keeps the trail arm connected to the body.",
          reps: 20,
        },
        {
          id: "deliberate-error-backswing",
          name: "Deliberate error contrast",
          description: "3 swings exaggerating shoulder pull (your old miss) → 3 correct.",
          hasDeliberateError: true,
        },
        {
          id: "metronome-tempo-no-ball",
          name: "Metronome tempo — no ball",
          description: "60 BPM. 3 beats back, 1 beat down. Just the move to the top — no ball yet.",
          metronomeBPM: 60,
        },
        {
          id: "video-dtl-top",
          name: "Video down-the-line",
          description: "Check the top position — elbow down + palm sky.",
          videoCheck: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate: "Elbow down, palm to sky. Today's best rep felt ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "70–80% of backswings on video show elbow down + palm sky",
        requiredGoodPct: 70,
        requiredConsecutiveSessions: 2,
      },
    },

    // ── Phase 3 ──────────────────────────────────────────────────────────────
    {
      id: "phase-3",
      number: "3",
      name: "Transition & Shallowing",
      skillFocus: "Shallowing + tempo consistency",
      estimatedSessions: { min: 4, max: 6 },
      cueCard: {
        cue: "Drop under, elbow to pocket.",
        feel: "Club falls behind, trail elbow tucks into trail hip pocket.",
      },
      compileDrills: [
        {
          id: "perfector-shallow",
          name: "Perfector on-plane back → deliberate shallow under",
          description: "30 reps. Feel the club fall behind on the way down.",
          reps: 30,
        },
        {
          id: "pump-drill",
          name: "Pump drill",
          description: "Full backswing → pump P6 twice → swing through. 15 reps.",
          reps: 15,
        },
        {
          id: "tempo-block-72",
          name: "Tempo block — 72 BPM",
          description: "20 balls. Stay with the beat. Rushed transition = balloon.",
          reps: 20,
          metronomeBPM: 72,
        },
        {
          id: "deliberate-error-shallow",
          name: "Deliberate error contrast",
          description: "3 over-the-top (steep) swings → 3 shallowed. Big contrast.",
          hasDeliberateError: true,
        },
        {
          id: "random-insert-clubs",
          name: "Random insert — club switching",
          description: "Every 5th ball, switch clubs (7i → driver → 7i). Variability locks the pattern.",
          randomInsert: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate: "Drop under, elbow to pocket. The feel was ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "70–80% under-plane delivery on DTL video, two sessions running",
        requiredGoodPct: 70,
        requiredConsecutiveSessions: 2,
        requiresVideoConfirmation: true,
      },
    },

    // ── Phase 4 ──────────────────────────────────────────────────────────────
    {
      id: "phase-4",
      number: "4",
      name: "Downswing Delivery",
      skillFocus: "Lead leg push + hip stability + acceleration",
      estimatedSessions: { min: 4, max: 6 },
      cueCard: {
        cue: "Plant and push.",
        feel: "Lead heel hits the ground, glutes fire, hips wait half a beat.",
      },
      notes: [
        "Driver setup from Phase 1.5 pays off here — trail-side pre-load gives the push something to push from.",
        "High lead hip + spine tilt = upward strike.",
      ],
      compileDrills: [
        {
          id: "lead-leg-step",
          name: "Lead-leg step drill",
          description: "20 reps. Step into the lead foot through impact.",
          reps: 20,
        },
        {
          id: "push-and-snap",
          name: "Half-swing push and snap",
          description: "20 reps. Plant, push, snap through.",
          reps: 20,
        },
        {
          id: "deliberate-error-slide",
          name: "Deliberate error contrast",
          description: "3 sliding swings (old hip slide) → 3 with the push. Big contrast.",
          hasDeliberateError: true,
        },
        {
          id: "alignment-stick-feedback",
          name: "Alignment stick under lead foot",
          description: "Pressure feedback — feel the heel plant.",
        },
        {
          id: "metronome-72",
          name: "Metronome at 72 BPM — continues",
          description: "Tempo holds everything together. Stay with the beat through the push.",
          metronomeBPM: 72,
        },
        {
          id: "random-insert-driver-3w-3h",
          name: "Random insert — 5 driver / 5 3W / 5 3H rotation",
          description: "Run mid-session. Tests the push across the long clubs.",
          randomInsert: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 10,
        verbalRecapTemplate: "Plant and push. Hips wait. The thump felt ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "70–80% solid contact, no balloons, peak height in target window — two sessions running",
        requiredGoodPct: 70,
        requiredConsecutiveSessions: 2,
      },
    },

    // ── Phase 4.5 ────────────────────────────────────────────────────────────
    {
      id: "phase-4-5",
      number: "4.5",
      name: "Face Control",
      skillFocus: "Face control through impact",
      estimatedSessions: { min: 2, max: 3 },
      cueCard: {
        cue: "Logo down.",
        feel: "Glove logo points at the ground past impact.",
      },
      compileDrills: [
        {
          id: "slow-impact-reps",
          name: "Slow-motion impact reps — no ball",
          description: "20 reps. Walk through the impact position slowly.",
          reps: 20,
        },
        {
          id: "half-swing-draws",
          name: "Half-swing draws into net",
          description: "15 reps. Feel the face turning over.",
          reps: 15,
        },
        {
          id: "tee-gate",
          name: "Tee gate",
          description: "Tee outside heel + outside toe of the ball. Miss both tees.",
        },
        {
          id: "deliberate-error-flip",
          name: "Deliberate error contrast",
          description: "3 swings flipping hands (open face) → 3 with logo down.",
          hasDeliberateError: true,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate: "Logo down. Draw bias from face, not hands.",
        preSleepVisualization: true,
      },
      gate: {
        description: "70–80% baby draw or straight, two sessions running",
        requiredGoodPct: 70,
        requiredConsecutiveSessions: 2,
      },
    },

    // ── Phase 5 ──────────────────────────────────────────────────────────────
    {
      id: "phase-5",
      number: "5",
      name: "Integration & Pressure",
      skillFocus: "Combining everything under varying conditions",
      estimatedSessions: { min: 6, max: 12 },
      cueCard: {
        cue: "Trust the move. One swing thought.",
        feel: "Pre-shot routine identical every time — current phase cue only.",
      },
      notes: [
        "Mostly random and variable practice — research shows this is when skill transfers to the course.",
        "3W/3H setup note: less secondary tilt, closer to 50/50 pressure, ball position 1–2 ball widths back.",
      ],
      compileDrills: [
        {
          id: "block-warmup-rotation",
          name: "Block warm-up — 10 driver / 10 3W / 10 3H",
          description: "Full pre-shot routine on every shot.",
          reps: 30,
        },
        {
          id: "random-practice-block",
          name: "Random practice block",
          description: "30 balls. Rotate clubs every shot, vary targets every shot, vary trajectories (low/mid/high). No two consecutive the same.",
          reps: 30,
          randomInsert: true,
        },
        {
          id: "pressure-3-in-a-row",
          name: "Pressure — 3 good in a row",
          description: "3 good shots in a row before moving on. Miss = restart the streak.",
        },
        {
          id: "stakes-drill",
          name: "Stakes drill",
          description: "Fail 3 attempts at the pressure drill → 10 push-ups. Mild stress = norepinephrine = faster learning.",
        },
        {
          id: "course-simulation",
          name: "Course simulation — 5 holes",
          description: "Pick 5 holes from your home course. Specific target, specific shape, full pre-shot routine. Track with Arccos.",
        },
      ],
      consolidate: {
        idleRestMinutes: 10,
        verbalRecapTemplate: "I held tempo on ___. Lost the push on ___. Need to feel ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "Integration phase — ongoing. No hard gate; track baseline every 2 weeks.",
      },
    },
  ],
};
