"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Save, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { getClubBag } from "@/app/actions";
import { saveGameSession } from "@/lib/practice/save-game-session";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import type { Drill, SkillCategory } from "@/lib/practice/types";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";
import { GameScoreCompare } from "@/components/practice/GameScoreCompare";
import { useGamePersonalBest } from "@/components/practice/useGamePersonalBest";

type ShotEntry = { drill: Drill; rating: number; shape?: ShapeType; trajectory?: TrajectoryType };
type BagEntry  = { club: string; carry: number };

// ── Realistic hole generation from user's bag ─────────────────────────────────

function pickClub(bag: BagEntry[], preferredCarry: number, fallback: string): { club: string; distance: string } {
  const withCarry = bag.filter(e => e.carry > 0);
  if (!withCarry.length) return { club: fallback, distance: preferredCarry >= 999 ? "Full" : `${preferredCarry} yd` };
  if (preferredCarry >= 999) {
    const longest = withCarry.reduce((a, b) => b.carry > a.carry ? b : a);
    return { club: longest.club, distance: `${longest.carry} yd` };
  }
  const closest = withCarry.reduce((a, b) =>
    Math.abs(b.carry - preferredCarry) < Math.abs(a.carry - preferredCarry) ? b : a
  );
  return { club: closest.club, distance: `${closest.carry} yd` };
}

function makeDrill(label: string, club: string, distance: string, target: string, category: SkillCategory = "full-swing"): Drill {
  return {
    id: `r3h-${Math.random().toString(36).slice(2)}`,
    name: label,
    category,
    club,
    distance,
    target,
  };
}

const PAR4_SCENARIOS = [
  "Dogleg right — shape it away from the trees",
  "Narrow fairway — pick a side and commit",
  "Downhill — take one less club on the approach",
  "Headwind — ball flight matters more than distance",
];
const PAR3_SCENARIOS = [
  "Water short-right — middle of the green is always right",
  "Elevated green — club up, aim for the fat part",
  "Cross-wind — start it into the wind",
  "Tucked pin — miss on the fat side",
];
const PAR5_SCENARIOS = [
  "Lay up smart, then trust your wedge",
  "Uphill — commit to each shot, don't force the next",
  "Reachable in two, but the green is guarded — play smart",
  "Wide fairway, bunker 280 out — pick your number and go",
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

function generateHoles(bag: BagEntry[]): Array<{ holeNumber: number; par: 3|4|5; scenario: string; shots: Drill[] }> {
  const driver  = pickClub(bag, 999, "Driver");
  const approach = pickClub(bag, 160, "7-Iron");
  const par3Club = pickClub(bag, 175, "6-Iron");
  const layup   = pickClub(bag, 220, "3-Wood");
  const wedge   = pickClub(bag, 95,  "SW");

  const templates = shuffle<3|4|5>([4, 3, 5]);

  return templates.map((par, i) => {
    const num = i + 1;
    if (par === 3) {
      return {
        holeNumber: num, par,
        scenario: pick(PAR3_SCENARIOS),
        shots: [makeDrill("Tee shot", par3Club.club, par3Club.distance, "Any part of the green")],
      };
    }
    if (par === 4) {
      return {
        holeNumber: num, par,
        scenario: pick(PAR4_SCENARIOS),
        shots: [
          makeDrill("Tee shot",  driver.club,   driver.distance,   "Find the fairway"),
          makeDrill("Approach",  approach.club, approach.distance, "On the green — any pin"),
        ],
      };
    }
    return {
      holeNumber: num, par,
      scenario: pick(PAR5_SCENARIOS),
      shots: [
        makeDrill("Tee shot", driver.club, driver.distance, "Center fairway"),
        makeDrill("Lay-up",   layup.club,  layup.distance,  "100 yards to flag"),
        makeDrill("Pitch",    wedge.club,  wedge.distance,  "Inside 20 feet", "wedges"),
      ],
    };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Random3Hole() {
  const { personalBest, noteSavedScore, personalBestReady } = useGamePersonalBest("random-3-hole");
  const [bag, setBag] = useState<BagEntry[]>([]);
  const [holes, setHoles] = useState<ReturnType<typeof generateHoles>>([]);
  const sessionStartedAtRef = useSessionStartedAt(holes.length > 0);
  const [currentHole, setCurrentHole] = useState(0);
  const [currentShotInHole, setCurrentShotInHole] = useState(0);
  const [shotEntries, setShotEntries] = useState<ShotEntry[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
  const [pendingTrajectory, setPendingTrajectory] = useState<TrajectoryType | null>(null);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    getClubBag().then(setBag);
  }, []);

  function generateRound() {
    const newHoles = generateHoles(bag);
    setHoles(newHoles);
    setCurrentHole(0);
    setCurrentShotInHole(0);
    setShotEntries([]);
    setPendingShape(null);
    setPendingTrajectory(null);
    setIsComplete(false);
    const total = newHoles.reduce((s, h) => s + h.shots.length, 0);
    toast.success(`3 holes generated — ${total} shots. Let's play.`);
  }

  const currentHoleData = holes[currentHole];
  const currentDrill    = currentHoleData?.shots[currentShotInHole];
  const isLastShotOfHole = currentShotInHole === (currentHoleData?.shots.length ?? 1) - 1;
  const isLastHole       = currentHole === holes.length - 1;
  const skipIntention    = !currentDrill || currentDrill.category === "putting" || currentDrill.category === "bunker";
  const intentionReady   = skipIntention || (pendingShape !== null && pendingTrajectory !== null);
  const totalShots       = holes.reduce((s, h) => s + h.shots.length, 0);
  const progressPct      = totalShots > 0 ? (shotEntries.length / totalShots) * 100 : 0;

  function rateShot(rating: number) {
    if (!intentionReady) return;
    const entry: ShotEntry = {
      drill: currentDrill!,
      rating,
      shape:      skipIntention ? undefined : pendingShape      ?? undefined,
      trajectory: skipIntention ? undefined : pendingTrajectory ?? undefined,
    };
    const newEntries = [...shotEntries, entry];
    setShotEntries(newEntries);
    setPendingShape(null);
    setPendingTrajectory(null);

    if (isLastHole && isLastShotOfHole) {
      setIsComplete(true);
      const avg = (newEntries.reduce((a, b) => a + b.rating, 0) / newEntries.length).toFixed(1);
      toast.success(`Round complete — avg feel ${avg}/5`);
    } else if (isLastShotOfHole) {
      setCurrentHole(h => h + 1);
      setCurrentShotInHole(0);
      if (restInterval > 0) setIsResting(true);
    } else {
      setCurrentShotInHole(s => s + 1);
      if (restInterval > 0) setIsResting(true);
    }
  }

  function resetGame() {
    setHoles([]);
    setCurrentHole(0);
    setCurrentShotInHole(0);
    setShotEntries([]);
    setPendingShape(null);
    setPendingTrajectory(null);
    setIsComplete(false);
  }

  async function saveSession() {
    const avg = shotEntries.length > 0
      ? (shotEntries.reduce((a, b) => a + b.rating, 0) / shotEntries.length)
      : 0;
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await saveGameSession({
      type: "game",
      title: "Random 3-Hole Challenge",
      ...timing,
      config: { gameId: "random-3-hole", shotEntries, holes },
      score: Math.round(avg * 10) / 10,
    }, noteSavedScore);
    if (res.success) toast.success("Saved!");
    else toast.error("Save failed");
  }

  return (
    <>
      {isResting && <RestBetweenShots seconds={restInterval} onComplete={() => setIsResting(false)} />}
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Shuffle className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tighter">Random 3-Hole Challenge</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          3 holes with realistic shot sequences using your real bag. Hole order shuffled every round.
        </p>

        {/* ── SETUP ───────────────────────────────────────────────────── */}
        {holes.length === 0 && (
          <div className="space-y-6 max-w-sm mx-auto">
            <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
            <Button size="lg" onClick={generateRound} className="w-full h-14">
              <Shuffle className="mr-2 h-5 w-5" /> Generate 3 Holes
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Par 3 + Par 4 + Par 5 in random order · Uses your bag
            </p>
          </div>
        )}

        {/* ── PLAYING ─────────────────────────────────────────────────── */}
        {holes.length > 0 && !isComplete && currentDrill && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>Hole {currentHole + 1} · Par {currentHoleData.par} · {currentDrill.name}</span>
              <span>{shotEntries.length}/{totalShots}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground italic mb-4">{currentHoleData.scenario}</p>

            <div className="bg-card border rounded-2xl p-6 mb-5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                {currentDrill.name}
              </div>
              <div className="text-2xl font-semibold mb-1">
                {currentDrill.club} — {currentDrill.distance}
              </div>
              <div className="text-lg text-muted-foreground">{currentDrill.target}</div>
            </div>

            {skipIntention ? (
              <div className="bg-muted/40 border rounded-xl px-4 py-2.5 text-xs text-center text-muted-foreground mb-4">
                No shape/trajectory needed for this shot
              </div>
            ) : (
              <div className="mb-4">
                <IntentionPicker
                  shape={pendingShape}
                  trajectory={pendingTrajectory}
                  onShape={setPendingShape}
                  onTrajectory={setPendingTrajectory}
                />
              </div>
            )}

            <div className={`text-center text-sm mb-3 transition ${intentionReady ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
              {intentionReady ? "How did this shot feel?" : "Set your intention first ↑"}
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  onClick={() => rateShot(r)}
                  disabled={!intentionReady}
                  className="h-14 w-14 rounded-2xl border text-2xl font-semibold active:bg-primary active:text-white hover:bg-muted transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">1 = poor · 5 = exactly as intended</p>
          </div>
        )}

        {/* ── RESULTS ─────────────────────────────────────────────────── */}
        {isComplete && (
          <div className="space-y-6">
            {(() => {
              const avgScore = Math.round((shotEntries.reduce((a, b) => a + b.rating, 0) / shotEntries.length) * 10) / 10;
              return (
                <>
            <div className="text-center py-6 bg-card rounded-2xl border">
              <div className="text-5xl font-semibold tracking-tighter text-accent tabular-nums">
                {avgScore}
              </div>
              <div className="text-xl">average feel out of 5</div>
            </div>

            <GameScoreCompare gameId="random-3-hole" score={avgScore} personalBest={personalBest} personalBestReady={personalBestReady} />

            <div className="bg-card border rounded-2xl p-5 text-sm space-y-2">
              {holes.map(h => (
                <div key={h.holeNumber} className="border-b last:border-0 pb-2 last:pb-0">
                  <div className="text-xs font-semibold text-muted-foreground mb-1">
                    Hole {h.holeNumber} · Par {h.par}
                  </div>
                  {shotEntries
                    .filter(e => h.shots.some(s => s.id === e.drill.id))
                    .map((e, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 py-0.5">
                        <div className="min-w-0">
                          <span className="truncate">{e.drill.name} — {e.drill.club}</span>
                          {e.shape && <span className="text-xs text-muted-foreground ml-1">· {e.shape} {e.trajectory}</span>}
                        </div>
                        <span className="font-medium shrink-0">{e.rating}/5</span>
                      </div>
                    ))}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={resetGame} variant="outline" size="lg" className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" /> Play Again
              </Button>
              <Button onClick={saveSession} size="lg" className="flex-1">
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
            <Link href="/practice/games">
              <Button variant="ghost" className="w-full">Back to Games</Button>
            </Link>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}
