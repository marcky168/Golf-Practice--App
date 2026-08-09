import type { Program, ProgramWarmup } from "./types";

/**
 * Precision Shot Control Program — equipment-integrated.
 *
 * Four parallel modules (not a sequential ladder): the user picks whichever
 * one matches what they're practising today. Each module runs the same
 * four-block shape — Calibration → Ladder → Random → Pressure — mapped onto
 * the two compile blocks of the standard program session.
 *
 * Every module declares which of the four training aids it uses, what each one
 * is for, and the acceptance windows for the numbers those aids produce.
 * All devices remain optional and are toggled per session.
 */

const FULL_SWING_WARMUP: ProgramWarmup = {
  totalDuration: "10 min",
  blocks: [
    {
      duration: "3 min",
      description:
        "Mobility — T-spine open books 10/side, hip 90/90 transitions 5/side, trail-shoulder external rotation 15 reps",
    },
    {
      duration: "3 min",
      description:
        "Movement prep — 10 rotational squats, 10 step-throughs with a club, 10 pump drills",
    },
    {
      duration: "4 min",
      description:
        "Ramp-up — 10 wedges at 50%, 8 mid-irons at 70%, 5 long clubs at 85%. Full routine on the last three.",
    },
  ],
};

const SHORT_GAME_WARMUP: ProgramWarmup = {
  totalDuration: "6–8 min",
  blocks: [
    {
      duration: "2 min",
      description: "Mobility — hip 90/90 5/side, trail-shoulder circles, wrist flexion/extension holds",
    },
    {
      duration: "3 min",
      description:
        "Feel ladder — 10 half-swing wedges landing on progressively longer spots. No target scoring yet.",
    },
    {
      duration: "2 min",
      description: "Routine rehearsal — 5 full pre-shot routines at walking pace, no ball.",
    },
  ],
};

export const PRECISION_SHOT_CONTROL_PROGRAM: Program = {
  id: "precision-shot-control",
  name: "Precision Shot Control",
  shortDescription:
    "Four equipment-aware modules — driver face control, long-iron contact, approach distance, sand distance",
  fullDescription:
    "Four independent modules you pick between based on what you're training that day. Each runs Calibration → Ladder → Random → Pressure, the progression that moves a skill from conscious control to transfer. Every module supports the Plane Perfector, Hack Motion, Mevo Gen 2 Pro and face impact tape — all optional, toggled per session. When a device is on, the app scores the objective number instead of relying on your feel rating; when it's off, the module runs on feel alone with no loss of structure.",
  estimatedWeeks: { min: 4, max: 12 },
  parallelPhases: true,
  phaseNoun: "Module",

  warmup: SHORT_GAME_WARMUP,

  defineGoodShot: {
    criteria: [
      "Feel: the shot matched the intent you committed to before you swung",
      "Contact: strike within a ball-width of centre on the face tape",
      "Objective (when a device is on): the module's tech window was met — face-to-path, carry error or wrist range",
    ],
    scoring:
      "Feel + contact = good. With a device active, a shot only counts as good when the tech window is also met.",
  },

  weeklySchedule: [
    { day: "Mon", activity: "Module 1 — Driver Face & Direction Control" },
    { day: "Tue", activity: "Module 3 — Approach Distance Control Ladder" },
    { day: "Wed", activity: "Off or 10 min visualisation, no balls" },
    { day: "Thu", activity: "Module 2 — Long Iron / Fairway Wood Contact" },
    { day: "Fri", activity: "Module 4 — Sand Distance Judgment Ladder" },
    { day: "Sat", activity: "On-course — current module cues only, no tech" },
    { day: "Sun", activity: "Off (full rest = consolidation)" },
  ],

  phases: [
    // ── Module 1 ─────────────────────────────────────────────────────────────
    {
      id: "module-1-driver-face",
      number: "1",
      name: "Driver Face & Direction Control",
      skillFocus: "Face-to-path control and start-line accuracy off the tee",
      duration: "25–35 min",
      estimatedSessions: { min: 4, max: 10 },
      warmup: FULL_SWING_WARMUP,
      cueCard: {
        cue: "Face owns the start line.",
        feel: "Lead wrist bowing through impact, logo turning down.",
      },
      notes: [
        "The Plane Perfector comes out after the ladder — the random and pressure blocks must be free swings.",
        "Start line is a face problem before it is a path problem. Fix the face first, then narrow the path.",
      ],
      equipment: [
        {
          device: "face-impact",
          usage: "required",
          role: "Strike location every block — heel/toe strikes move the face and fake a path problem.",
        },
        {
          device: "mevo",
          usage: "optional",
          role: "Face-to-path, club path, attack angle, smash and start direction.",
        },
        {
          device: "hack-motion",
          usage: "optional",
          role: "Wrist at top (flat to slight extension) and at impact (bowed).",
        },
        {
          device: "plane-perfector",
          usage: "optional",
          role: "Path feel during calibration and the first balls of the ladder — especially when fades dominate.",
        },
      ],
      techMetrics: [
        "faceToPath",
        "clubPath",
        "attackAngle",
        "smashFactor",
        "wristAtTop",
        "wristAtImpact",
      ],
      techTargets: {
        faceToPathWindowDeg: 2,
        attackAngleRange: { min: 0, max: 6 },
        smashFactorMin: 1.45,
        wristAtTop: { min: -5, max: 15 },
        wristAtImpact: { min: -25, max: 0 },
        centerStrikePctMin: 60,
      },
      compileDrills: [
        {
          id: "m1-calibration",
          name: "Calibration",
          description:
            "5–7 min. 8–10 balls, no target pressure. Find today's baseline face and start line before you try to change anything.",
          duration: "5–7 min",
          block: 1,
          equipmentNotes: [
            { device: "face-impact", note: "Apply tape or spray now — this is your reference pattern for the session." },
            { device: "plane-perfector", note: "Use it for the first 4–5 swings only, then set it aside." },
            { device: "hack-motion", note: "Attach and note your resting wrist numbers before the first ball." },
            { device: "mevo", note: "Record a baseline face-to-path and start direction. Don't chase it yet." },
          ],
        },
        {
          id: "m1-face-ladder",
          name: "Face Ladder",
          description:
            "12–15 balls. Work the face in steps: 5 deliberate fades → 5 straight → 5 deliberate draws. You are learning the range of the face, not hitting good shots.",
          reps: 15,
          block: 1,
          equipmentNotes: [
            { device: "plane-perfector", note: "Keep it in for the first 5–6 balls if path is today's main issue, then remove it." },
            { device: "hack-motion", note: "Watch the impact number — the draw rungs should read more bowed than the fade rungs." },
            { device: "mevo", note: "Face-to-path should move with the intent. If it doesn't, the ladder isn't working yet." },
          ],
        },
        {
          id: "m1-random-shape",
          name: "Random Shape & Target",
          description:
            "12–15 balls. Call the shape and the target out loud before each ball, then change both. No two consecutive the same. Full routine every time.",
          reps: 15,
          randomInsert: true,
          block: 2,
          equipmentNotes: [
            { device: "plane-perfector", note: "Out of play for this block — the free swing is the point." },
            { device: "mevo", note: "Log face-to-path and curvature against what you called before the swing." },
            { device: "face-impact", note: "Re-apply before the block so this pattern is separate from calibration." },
          ],
        },
        {
          id: "m1-pressure",
          name: "Pressure Set",
          description:
            "3 good shots in a row to finish. A miss restarts the streak. Same equipment as the random block.",
          block: 2,
          equipmentNotes: [
            { device: "mevo", note: "A shot only counts when face-to-path is inside the 2° window as well as looking right." },
          ],
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate:
          "My face-to-path ran ___ today. The start line went ___ when I missed. Next time I feel ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "70% good across two sessions running",
        requiredGoodPct: 70,
        requiredConsecutiveSessions: 2,
      },
    },

    // ── Module 2 ─────────────────────────────────────────────────────────────
    {
      id: "module-2-long-iron-contact",
      number: "2",
      name: "Long Iron / Fairway Wood Contact",
      skillFocus: "Low point control and ball-first contact from varied lies",
      duration: "20–30 min",
      estimatedSessions: { min: 4, max: 10 },
      warmup: FULL_SWING_WARMUP,
      cueCard: {
        cue: "Ball first, ground second.",
        feel: "Lead wrist flat to bowed at impact, chest covering the ball.",
      },
      notes: [
        "Wrist position at impact is the single biggest lever on contact here — this is the module where Hack Motion earns its place.",
        "Vary the lie every few balls once the ladder is done. A clean lie hides a low-point problem.",
      ],
      equipment: [
        {
          device: "hack-motion",
          usage: "recommended",
          role: "Wrist flexion at impact — the direct cause of fat and thin contact.",
        },
        {
          device: "face-impact",
          usage: "recommended",
          role: "Strike height on the face — low-face strikes mean the low point is behind the ball.",
        },
        {
          device: "mevo",
          usage: "optional",
          role: "Attack angle, smash factor and face-to-path.",
        },
        {
          device: "plane-perfector",
          usage: "optional",
          role: "Path consistency during the first few calibration swings only.",
        },
      ],
      techMetrics: ["attackAngle", "smashFactor", "faceToPath", "wristAtImpact"],
      techTargets: {
        attackAngleRange: { min: -5, max: -1 },
        smashFactorMin: 1.35,
        faceToPathWindowDeg: 3,
        wristAtImpact: { min: -25, max: 0 },
        centerStrikePctMin: 55,
      },
      compileDrills: [
        {
          id: "m2-low-point-calibration",
          name: "Low-Point Calibration",
          description:
            "8–10 balls off a clean lie. Draw a line or use a towel behind the ball. You are finding where the club is actually bottoming out today.",
          duration: "5 min",
          block: 1,
          equipmentNotes: [
            { device: "face-impact", note: "Apply now. Strike height matters more than heel/toe in this module." },
            { device: "hack-motion", note: "Attach before the first ball — impact wrist is the number that matters." },
            { device: "plane-perfector", note: "First few swings only, then remove it." },
            { device: "mevo", note: "Watch attack angle and smash. Both should settle before you move on." },
          ],
        },
        {
          id: "m2-contact-ladder",
          name: "Progressive Contact Ladder + Lie Variations",
          description:
            "12–15 balls. Start clean lie, then tight, then slightly down-grain rough. Same club throughout — only the lie changes.",
          reps: 15,
          block: 1,
          equipmentNotes: [
            { device: "plane-perfector", note: "Removed from here on — warm-up use only." },
            { device: "hack-motion", note: "A cupped (positive) impact number on a fat shot confirms the cause." },
            { device: "face-impact", note: "Track whether strikes drop lower on the face as the lie gets tighter." },
          ],
        },
        {
          id: "m2-random-club-lie",
          name: "Random Club + Lie Challenge",
          description:
            "12–15 balls. Change club and lie every ball — long iron, hybrid, fairway wood. Call the shot before you set up.",
          reps: 15,
          randomInsert: true,
          block: 2,
          equipmentNotes: [
            { device: "face-impact", note: "Re-apply before this block to keep the pattern separate." },
            { device: "mevo", note: "Attack angle should stay descending across every club here." },
          ],
        },
        {
          id: "m2-pressure",
          name: "Pressure Set",
          description:
            "3 ball-first strikes in a row from three different lies. Fat or thin restarts the streak.",
          block: 2,
          equipmentNotes: [
            { device: "hack-motion", note: "A strike only counts when the impact wrist is inside the target range." },
          ],
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate:
          "My low point was ___ today. Contact broke down on ___ lies. Next time I feel ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "70% ball-first contact across two sessions running",
        requiredGoodPct: 70,
        requiredConsecutiveSessions: 2,
      },
    },

    // ── Module 3 ─────────────────────────────────────────────────────────────
    {
      id: "module-3-approach-ladder",
      number: "3",
      name: "Approach Distance Control Ladder",
      skillFocus: "Carry distance accuracy from 60–140 yards",
      duration: "25 min",
      estimatedSessions: { min: 4, max: 10 },
      cueCard: {
        cue: "Length of swing, not effort.",
        feel: "Same tempo every shot — only the backswing length changes.",
      },
      notes: [
        "This is the module where the Mevo pays for itself: you cannot calibrate carry distances by eye at a range.",
        "Enter your target carry alongside the actual — the app scores the error for you.",
      ],
      equipment: [
        {
          device: "mevo",
          usage: "recommended",
          role: "Carry, total, landing angle and spin — the numbers this module is built on.",
        },
        {
          device: "face-impact",
          usage: "recommended",
          role: "Strike consistency, the hidden cause of distance scatter.",
        },
        {
          device: "hack-motion",
          usage: "optional",
          role: "Only worth attaching if contact is what's costing you distance.",
        },
        {
          device: "plane-perfector",
          usage: "not-needed",
          role: "Rarely relevant at these swing lengths.",
        },
      ],
      techMetrics: ["carry", "carryTarget", "totalDistance", "spinRate", "landingAngle"],
      techTargets: {
        carryErrorYds: 5,
        centerStrikePctMin: 60,
      },
      compileDrills: [
        {
          id: "m3-calibration",
          name: "Calibration",
          description:
            "8 balls, one club, full swing. Establish today's actual carry number before you try to control it. Conditions move this every day.",
          duration: "5 min",
          block: 1,
          equipmentNotes: [
            { device: "mevo", note: "Set the baseline carry here — enter it as the target for the ladder block." },
            { device: "face-impact", note: "Apply now so you can tell distance scatter from strike scatter." },
          ],
        },
        {
          id: "m3-fixed-ladder",
          name: "Fixed Ladder",
          description:
            "12 balls. Three swing lengths — half, three-quarter, full — four balls each. Commit to the length before you start each rung.",
          reps: 12,
          block: 1,
          equipmentNotes: [
            { device: "mevo", note: "Compare actual carry to intended carry on every rung, not just at the end." },
          ],
        },
        {
          id: "m3-random-distance",
          name: "3-Ball Random Distance + Lie",
          description:
            "12 balls in sets of three. Call a random target distance and lie before each set. You pick club and swing length.",
          reps: 12,
          randomInsert: true,
          block: 2,
          equipmentNotes: [
            { device: "mevo", note: "Enter the called distance as the target — the app scores your error." },
            { device: "face-impact", note: "Re-apply before this block." },
          ],
        },
        {
          id: "m3-pressure",
          name: "Pressure Set",
          description:
            "3 shots in a row inside your acceptable distance window. Miss the window and the streak restarts.",
          block: 2,
          equipmentNotes: [
            { device: "mevo", note: "Inside ±5 yards of the called carry counts. Nothing else does." },
          ],
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate:
          "My carry numbers ran ___ today. Distance broke down at ___ yards. Next time I feel ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "65% of shots inside the distance window across two sessions running",
        requiredGoodPct: 65,
        requiredConsecutiveSessions: 2,
      },
    },

    // ── Module 4 ─────────────────────────────────────────────────────────────
    {
      id: "module-4-sand-ladder",
      number: "4",
      name: "Sand Distance Judgment Ladder",
      skillFocus: "Carry control and consistency out of greenside sand",
      duration: "20–25 min",
      estimatedSessions: { min: 3, max: 8 },
      cueCard: {
        cue: "Same entry, different length.",
        feel: "Bounce thumping the sand two inches behind, hands passive.",
      },
      notes: [
        "Distance out of sand comes from swing length, not from hitting the sand harder or closer.",
        "Face tape is less critical here — the useful signal is thin/fat rate and how repeatable one swing length is.",
      ],
      equipment: [
        {
          device: "mevo",
          usage: "optional",
          role: "Carry confirmation, most useful on the longer sand shots.",
        },
        {
          device: "hack-motion",
          usage: "optional",
          role: "Only if you're breaking down wrists through the sand.",
        },
        {
          device: "face-impact",
          usage: "optional",
          role: "Less critical from sand, but still shows a breaking-down face.",
        },
        {
          device: "plane-perfector",
          usage: "not-needed",
          role: "No role in this module.",
        },
      ],
      techMetrics: ["carry", "carryTarget"],
      techTargets: {
        carryErrorYds: 4,
      },
      compileDrills: [
        {
          id: "m4-technique-calibration",
          name: "Technique Calibration",
          description:
            "8 shots, feel-focused. Draw entry lines in the sand. You are checking that the bounce enters at the same spot every time, nothing else.",
          duration: "5 min",
          block: 1,
          equipmentNotes: [
            { device: "mevo", note: "Optional here — this block is about entry point, not distance." },
          ],
        },
        {
          id: "m4-distance-ladder",
          name: "Distance Ladder",
          description:
            "12 shots. Three swing lengths — half, three-quarter, full — four each. Same entry point throughout. Note the carry each length produces.",
          reps: 12,
          block: 1,
          equipmentNotes: [
            { device: "mevo", note: "Confirm the actual carry for each swing length. This is your sand yardage chart." },
          ],
        },
        {
          id: "m4-random-distance",
          name: "Random Distance + Condition",
          description:
            "10 shots. Call a random pin distance and lie — buried, plugged, firm, fluffy — before each shot.",
          reps: 10,
          randomInsert: true,
          block: 2,
          equipmentNotes: [
            { device: "mevo", note: "Enter the called distance as the target for objective distance feedback." },
          ],
        },
        {
          id: "m4-pressure",
          name: "Pressure Set",
          description:
            "3 shots in a row finishing inside 10 feet from three different lies. A thin or fat restarts the streak.",
          block: 2,
        },
      ],
      consolidate: {
        idleRestMinutes: 5,
        verbalRecapTemplate:
          "My sand carries ran ___ today. I went thin or fat on ___. Next time I feel ___.",
        preSleepVisualization: true,
      },
      gate: {
        description: "60% of shots inside the distance window across two sessions running",
        requiredGoodPct: 60,
        requiredConsecutiveSessions: 2,
      },
    },
  ],
};
