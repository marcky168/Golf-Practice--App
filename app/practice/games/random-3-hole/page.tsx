"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { savePracticeSession } from "@/app/actions";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { generateRandomSession } from "@/lib/practice/generators";
import type { Drill } from "@/lib/practice/types";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";

type ShotEntry = { drill: Drill; rating: number; shape?: ShapeType; trajectory?: TrajectoryType };

export default function Random3Hole() {
  const [holes, setHoles] = useState<Array<{ holeNumber: number; shots: Drill[] }>>([]);
  const sessionStartedAtRef = useSessionStartedAt(holes.length > 0);
  const [currentHole, setCurrentHole] = useState(0);
  const [currentShotInHole, setCurrentShotInHole] = useState(0);
  const [shotEntries, setShotEntries] = useState<ShotEntry[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
  const [pendingTrajectory, setPendingTrajectory] = useState<TrajectoryType | null>(null);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  function generateRound() {
    // Generate 3 realistic holes (mostly 2 shots each = 6 shots total)
    const newHoles: Array<{ holeNumber: number; shots: Drill[] }> = [];

    for (let h = 1; h <= 3; h++) {
      const holeShots = generateRandomSession({
        durationMinutes: 10,
        numShots: 2,
        focusAreas: ["driver", "fairway-woods", "long-irons", "mid-irons", "short-irons", "wedges", "short-game"],
      }).drills;

      newHoles.push({
        holeNumber: h,
        shots: holeShots,
      });
    }

    setHoles(newHoles);
    setCurrentHole(0);
    setCurrentShotInHole(0);
    setShotEntries([]);
    setPendingShape(null);
    setPendingTrajectory(null);
    setIsComplete(false);
    toast.success("3 random holes generated! Let's play.");
  }

  function rateShot(rating: number) {
    if (!skipIntention && (!pendingShape || !pendingTrajectory)) return;

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
      toast.success(`3-Hole round complete! Average feel: ${avg}/5`);
    } else if (isLastShotOfHole) {
      setCurrentHole(currentHole + 1);
      setCurrentShotInHole(0);
      if (restInterval > 0) setIsResting(true);
    } else {
      setCurrentShotInHole(currentShotInHole + 1);
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
      ? (shotEntries.reduce((a, b) => a + b.rating, 0) / shotEntries.length).toFixed(1) 
      : "—";

    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await savePracticeSession({
      type: "game",
      title: "Random 3-Hole Challenge",
      ...timing,
      config: { gameId: "random-3-hole", shotEntries: shotEntries, holes },
      score: parseFloat(avg),
    });
    if (res.success) toast.success("Saved!");
    else toast.error("Save failed");
  }

  // Current shot helper
  const currentHoleData = holes[currentHole];
  const currentDrill = currentHoleData?.shots[currentShotInHole];
  const isLastShotOfHole = currentShotInHole === (currentHoleData?.shots.length ?? 1) - 1;
  const isLastHole = currentHole === holes.length - 1;

  const skipIntention = !currentDrill || currentDrill.category === "putting" || currentDrill.category === "bunker";
  const intentionReady = skipIntention || (pendingShape !== null && pendingTrajectory !== null);

  const totalShots = holes.reduce((sum, h) => sum + h.shots.length, 0);
  const completedShots = shotEntries.length;
  const progress = totalShots > 0 ? (completedShots / totalShots) * 100 : 0;

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
        Play 3 realistic holes. Each hole has a tee shot + approach (Driver + 8-iron, 3-wood + hybrid, or even a pitch/chip). No putting — just real golf shots.
      </p>

      {holes.length === 0 && (
        <div className="space-y-6 max-w-sm mx-auto">
          <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
          <div className="text-center">
            <Button size="lg" onClick={generateRound} className="h-14 px-10">
              <Shuffle className="mr-2 h-5 w-5" /> Generate 3 Random Holes
            </Button>
            <p className="text-xs text-muted-foreground mt-4">Realistic holes • 6 shots total • No putting</p>
          </div>
        </div>
      )}

      {holes.length > 0 && !isComplete && currentDrill && (
        <div>
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1.5 font-medium">
              <div>
                Hole {currentHole + 1} • Shot {currentShotInHole + 1} of {currentHoleData.shots.length}
              </div>
              <div>{Math.round(progress)}%</div>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-2 bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-6 mb-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Hole {currentHole + 1} — {currentShotInHole === 0 ? "Tee Shot" : "Approach"}
            </div>
            <div className="text-2xl font-semibold mb-1">
              {currentDrill.club} — {currentDrill.distance}
            </div>
            <div className="text-lg text-muted-foreground">{currentDrill.target}</div>
            {currentDrill.instructions && (
              <div className="mt-2 text-sm italic text-muted-foreground">{currentDrill.instructions}</div>
            )}
          </div>

          {skipIntention ? (
            <div className="bg-muted/40 border rounded-xl px-4 py-2.5 text-xs text-center text-muted-foreground mb-4">
              {currentDrill?.category === "putting" ? "Putting" : "Bunker"} — no shape/trajectory needed
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
        </div>
      )}

      {isComplete && (
        <div className="space-y-6">
          <div className="text-center py-6 bg-card rounded-2xl border">
            <div className="text-5xl font-semibold tracking-tighter text-accent tabular-nums">
              {(shotEntries.reduce((a, b) => a + b.rating, 0) / shotEntries.length).toFixed(1)}
            </div>
            <div className="text-xl">average feel out of 5</div>
          </div>

          <div className="bg-card border rounded-2xl p-5 text-sm space-y-2">
            {shotEntries.map((e, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate">{e.drill.club} — {e.drill.distance}</div>
                  {e.shape && (
                    <div className="text-xs text-muted-foreground">{e.shape} · {e.trajectory}</div>
                  )}
                </div>
                <span className="font-medium shrink-0">{e.rating}/5</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={resetGame} variant="outline" size="lg" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" /> Play Again
            </Button>
            <Button onClick={saveSession} size="lg" className="flex-1">
              <Save className="mr-2 h-4 w-4" /> Save Session
            </Button>
          </div>

          <Link href="/practice/games">
            <Button variant="ghost" className="w-full">Back to Games</Button>
          </Link>
        </div>
      )}
    </div>
    </>
  );
}
