"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import {
  calculateBinaryCircuitScore,
  MAKEABLE_PUTT_DISTANCES,
} from "@/lib/practice/games";
import { savePracticeSession } from "@/app/actions";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";

export default function MakeablePuttLadderGame() {
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const sessionStartedAtRef = useSessionStartedAt(phase === "playing");
  const [results, setResults] = useState<boolean[]>([]);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const currentIndex = results.length;
  const currentDist = MAKEABLE_PUTT_DISTANCES[currentIndex];
  const isComplete = results.length === MAKEABLE_PUTT_DISTANCES.length;
  const progress = (results.length / MAKEABLE_PUTT_DISTANCES.length) * 100;

  function record(made: boolean) {
    const next = [...results, made];
    setResults(next);
    if (next.length === MAKEABLE_PUTT_DISTANCES.length) {
      markUserHasPracticed();
      const { made: count } = calculateBinaryCircuitScore(next);
      toast.success(`${count}/5 putts made — ladder complete.`);
    } else if (restInterval > 0) {
      setIsResting(true);
    }
  }

  function resetGame() {
    setResults([]);
    setPhase("setup");
  }

  async function saveSession() {
    const summary = calculateBinaryCircuitScore(results);
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await savePracticeSession({
      type: "game",
      title: "Makeable Putt Ladder",
      ...timing,
      config: { gameId: "makeable-putt-ladder", results, distances: [...MAKEABLE_PUTT_DISTANCES] },
      score: summary.made,
    });
    if (res.success) toast.success("Saved!");
    else toast.error("Save failed");
  }

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Target className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tighter">Makeable Putt Ladder</h1>
        </div>
        <p className="text-muted-foreground mb-6">One putt each: 4 → 6 → 8 → 10 → 12 feet. Make or miss — honest scoring.</p>
        <div className="bg-muted/40 rounded-xl p-4 text-sm mb-8 space-y-1">
          {MAKEABLE_PUTT_DISTANCES.map((d, i) => (
            <div key={d}>{i + 1}. {d}</div>
          ))}
        </div>
        <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
        <Button size="lg" className="w-full h-14 text-lg mt-6" onClick={() => setPhase("playing")}>
          Start Ladder
        </Button>
      </div>
    );
  }

  const summary = calculateBinaryCircuitScore(results);

  return (
    <>
      {isResting && <RestBetweenShots seconds={restInterval} onComplete={() => setIsResting(false)} />}
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>

        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium mb-1.5">
            <span>Putt {Math.min(currentIndex + 1, 5)} of 5</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-2 bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {!isComplete && (
          <div className="mb-8">
            <div className="text-center mb-6">
              <div className="text-5xl font-semibold tabular-nums">{currentDist}</div>
              <div className="text-muted-foreground">current distance</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" className="h-16 text-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => record(true)}>
                Made it
              </Button>
              <Button size="lg" variant="destructive" className="h-16 text-xl" onClick={() => record(false)}>
                Missed
              </Button>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-6">
            <div className="text-center py-6 bg-card rounded-2xl border">
              <div className="text-6xl font-semibold text-emerald-600 tabular-nums">{summary.made}/5</div>
              <div className="text-xl mt-1">putts made</div>
            </div>
            <div className="bg-card border rounded-2xl p-5 text-sm">
              {MAKEABLE_PUTT_DISTANCES.map((d, i) => (
                <div key={d} className="flex justify-between py-1.5 border-b last:border-0">
                  <span>{d}</span>
                  <span className={results[i] ? "text-emerald-600 font-medium" : "text-red-500"}>
                    {results[i] ? "Made" : "Missed"}
                  </span>
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
            <Link href="/practice/games"><Button variant="ghost" className="w-full">Back to Games</Button></Link>
          </div>
        )}
      </div>
    </>
  );
}
