import { Drill, SkillCategory } from "./types";

// =====================================================
// Master Drill Library — Golf Practice OS
// Add new drills here. The generator and templates consume this list.
// Keep descriptions actionable and concise.
// =====================================================

export const ALL_DRILLS: Drill[] = [
  // DRIVER
  { id: "d1", name: "Driver — Fairway Finder", category: "driver", club: "Driver", distance: "Full", target: "Center of fairway target", shotShape: "straight", instructions: "Pick a precise spot 240+ yards out. Full pre-shot routine." },
  { id: "d2", name: "Driver — Controlled Fade", category: "driver", club: "Driver", distance: "Full", target: "Right half of fairway", shotShape: "fade", instructions: "Slightly open stance, feel path out-to-in just enough." },
  { id: "d3", name: "Driver — Low Stinger", category: "driver", club: "Driver", distance: "Full", target: "Low trajectory under wind", shotShape: "low", instructions: "Ball back, hands forward, punch through impact." },

  // FAIRWAY WOODS / HYBRIDS
  { id: "fw1", name: "3-Wood — Fairway Runner", category: "fairway-woods", club: "3-Wood", distance: "220 yd", target: "Left-center flag", shotShape: "any" },
  { id: "hy1", name: "Hybrid — Punch 4-iron distance", category: "fairway-woods", club: "3-Hybrid", distance: "190 yd", target: "Small target", shotShape: "low" },

  // LONG IRONS
  { id: "li1", name: "4-Iron — Controlled Draw", category: "long-irons", club: "4-Iron", distance: "195 yd", target: "Left flag", shotShape: "draw" },
  { id: "li2", name: "5-Iron — High Soft Landing", category: "long-irons", club: "5-Iron", distance: "180 yd", target: "Center green", shotShape: "high" },

  // MID IRONS (most common practice)
  { id: "mi1", name: "7-Iron — Pure Center Strike", category: "mid-irons", club: "7-Iron", distance: "155 yd", target: "Center flag", shotShape: "straight", instructions: "Focus on compressing the ball — divot starts after ball." },
  { id: "mi2", name: "8-Iron — 3/4 Swing Distance Control", category: "mid-irons", club: "8-Iron", distance: "130 yd", target: "Right flag", shotShape: "any" },
  { id: "mi3", name: "6-Iron — Draw to Left Target", category: "mid-irons", club: "6-Iron", distance: "165 yd", target: "Left flag", shotShape: "draw" },

  // SHORT IRONS & WEDGES
  { id: "wi1", name: "PW — Knockdown 120 yd", category: "short-irons", club: "PW", distance: "120 yd", target: "Small target", shotShape: "low" },
  { id: "we1", name: "Gap Wedge — 95 yd Stock", category: "wedges", club: "GW", distance: "95 yd", target: "Flag", shotShape: "any" },
  { id: "we2", name: "56° — High Soft 60 yd", category: "wedges", club: "56°", distance: "60 yd", target: "Tight pin", shotShape: "high", instructions: "Open face, accelerate through the turf." },
  { id: "we3", name: "60° — Low Runner 40 yd", category: "wedges", club: "60°", distance: "40 yd", target: "Front of green", shotShape: "low" },

  // SHORT GAME
  { id: "sg1", name: "Chip 20 yd — Landing Spot Drill", category: "short-game", club: "8-Iron / PW", distance: "20 yd", target: "3 ft circle on green", lie: "fairway", instructions: "Pick one landing spot every time. Roll out to hole." },
  { id: "sg2", name: "Pitch 40 yd — Varying Lies", category: "short-game", club: "56°", distance: "30-45 yd", target: "Random pin", lie: "rough", instructions: "One ball from fairway, one from light rough, one from uphill." },
  { id: "sg3", name: "Bump & Run 15 yd", category: "short-game", club: "PW", distance: "15 yd", target: "Hole", lie: "fairway", instructions: "Tight lie — clean ball-then-turf contact." },

  // PUTTING
  { id: "pu1", name: "Lag Putting — 25 ft", category: "putting", club: "Putter", distance: "25 ft", target: "3 ft circle around hole", instructions: "Speed is everything. Die the ball at the back of the cup." },
  { id: "pu2", name: "Short Putts — 4 ft Pressure", category: "putting", club: "Putter", distance: "4 ft", target: "Dead center", reps: 12 },
  { id: "pu3", name: "30 ft — 3-Ball Ladder", category: "putting", club: "Putter", distance: "30 ft", target: "Inside 6 ft", instructions: "Three balls, try to get all inside 6 feet." },

  // BUNKER
  { id: "bu1", name: "Greenside Bunker — 15 yd Explosion", category: "bunker", club: "56°", distance: "15 yd", target: "Pin", lie: "bunker", instructions: "Open clubface, hit 2 inches behind ball, full follow-through." },
  { id: "bu2", name: "Fairway Bunker — 140 yd 7-iron", category: "bunker", club: "7-Iron", distance: "140 yd", target: "Center green", lie: "bunker" },

  // TEMPO & FEEL
  { id: "te1", name: "Metronome Tempo — 7-iron", category: "tempo", club: "7-Iron", distance: "150 yd", target: "Center", instructions: "Use phone metronome at 68-72 bpm. Backswing on 1, impact on 3." },
  { id: "te2", name: "Half-Swing Tempo — PW", category: "tempo", club: "PW", distance: "80 yd", target: "Flag" },
];

// Helper: get drills by category
export function getDrillsByCategory(cats: SkillCategory[]): Drill[] {
  return ALL_DRILLS.filter(d => cats.includes(d.category));
}

// Get a few random drills from a category (used by generator)
export function getRandomDrillsFromCategory(category: SkillCategory, count: number): Drill[] {
  const pool = ALL_DRILLS.filter(d => d.category === category);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, pool.length));
}
