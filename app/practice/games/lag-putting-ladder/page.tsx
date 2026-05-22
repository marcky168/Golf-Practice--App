"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { calculateLagLadderScore } from "@/lib/practice/games";
import { savePracticeSession } from "@/app/actions";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { useEffect } from "react";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";

type BallScore = 5 | 3 | 1 | 0;

const distances = ["8 ft", "15 ft", "25 ft", "40 ft"];
const scoreOptions: { value: BallScore; label: string }[] = [
  { value: 5, label: "Inside 3 ft (5)" },
  { value: 3, label: "Inside 6 ft (3)" },
  { value: 1, label: "Inside 10 ft (1)" },
  { value: 0, label: "Outside 10 ft (0)" },
];

export default function LagPuttingLadder() {
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const sessionStartedAtRef = useSessionStartedAt(phase === "playing");
  const [results, setResults] = useState<BallScore[][]>([[], [], [], []]); // 4 distances × 3 balls
  const [currentDistanceIndex, setCurrentDistanceIndex] = useState(0);
  const [currentBall, setCurrentBall] = useState(0);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const isComplete = results.every((d) => d.length === 3);

  const currentDist = distances[currentDistanceIndex];
  const ballsAtCurrent = results[currentDistanceIndex].length;

  useEffect(() => {
    if (isComplete) {
      markUserHasPracticed();
    }
  }, [isComplete]);

  function recordBall(score: BallScore) {
    const newResults = [...results];
    newResults[currentDistanceIndex] = [...newResults[currentDistanceIndex], score];
    setResults(newResults);

    if (ballsAtCurrent + 1 < 3) {
      setCurrentBall(currentBall + 1);
      if (restInterval > 0) setIsResting(true);
    } else if (currentDistanceIndex < 3) {
      setCurrentDistanceIndex(currentDistanceIndex + 1);
      setCurrentBall(0);
      if (restInterval > 0) setIsResting(true);
    } else {
      const final = calculateLagLadderScore(newResults);
      toast.success(`Ladder complete! ${final.total} points`);
    }
  }

  function resetGame() {
    setResults([[], [], [], []]);
    setCurrentDistanceIndex(0);
    setCurrentBall(0);
  }

  async function saveSession() {
    const result = calculateLagLadderScore(results);
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await savePracticeSession({
      type: "game",
      title: "Lag Putting Ladder",
      ...timing,
      config: { gameId: "lag-putting-ladder", results },
      score: result.total,
    });
    if (res.success) toast.success("Game saved!");
    else toast.error("Save failed");
  }

  const progress = (results.flat().length / 12) * 100;

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Target className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tighter">Lag Putting Ladder</h1>
        </div>
        <p className="text-muted-foreground mb-8">Distance control is everything. 3 balls at each distance.</p>
        <div className="space-y-6">
          <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
          <Button size="lg" className="w-full h-14 text-lg" onClick={() => setPhase("playing")}>
            Start Ladder
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
    {isResting && <RestBetweenShots seconds={restInterval} onComplete={() => setIsResting(false)} />}
    <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
      <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Games
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Target className="h-8 w-8 text-accent" />
        <h1 className="text-3xl font-semibold tracking-tighter">Lag Putting Ladder</h1>
      </div>
      <p className="text-muted-foreground mb-6">Distance control is everything. 3 balls at each distance.</p>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1.5 font-medium">
          <div>{distances[currentDistanceIndex]} — Ball {ballsAtCurrent + 1} of 3</div>
          <div>{Math.round(progress)}%</div>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-2 bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Current Distance */}
      {!isComplete && (
        <div className="mb-8">
          <div className="text-center mb-4">
            <div className="text-5xl font-semibold tabular-nums tracking-tighter">{currentDist}</div>
            <div className="text-muted-foreground">from the hole</div>
          </div>

          <div className="text-xs uppercase tracking-widest text-center text-muted-foreground mb-3">
            Where did the ball finish?
          </div>

          <div className="space-y-2.5">
            {scoreOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => recordBall(opt.value)}
                className="w-full h-14 rounded-2xl border bg-card text-left px-6 text-lg active:bg-accent active:text-white hover:bg-muted transition flex items-center justify-between"
              >
                <span>{opt.label}</span>
                <span className="font-semibold tabular-nums text-xl">+{opt.value}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {isComplete && (
        <div className="space-y-6">
          {(() => {
            const result = calculateLagLadderScore(results);
            return (
              <>
                <div className="text-center py-6 bg-card rounded-2xl border">
                  <div className="text-6xl font-semibold tracking-tighter text-accent tabular-nums">
                    {result.total}
                  </div>
                  <div className="text-xl mt-1">out of {result.max} possible points</div>
                </div>

                <div className="bg-card border rounded-2xl p-5">
                  <div className="font-medium mb-3">Performance by distance</div>
                  {result.byDistance.map((d, i) => (
                    <div key={i} className="flex justify-between py-1.5 border-b last:border-none text-sm">
                      <span>{d.distance}</span>
                      <span className="font-semibold tabular-nums">{d.score} / 15</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          <div className="flex gap-3">
            <Button onClick={resetGame} variant="outline" size="lg" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" /> Try Again
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

      {/* Distance progress indicator */}
      {!isComplete && (
        <div className="mt-8 text-center text-xs text-muted-foreground">
          Distances: {distances.map((d, i) => (
            <span key={i} className={i === currentDistanceIndex ? "font-bold text-foreground" : ""}>
              {d}{i < 3 ? " → " : ""}
            </span>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
