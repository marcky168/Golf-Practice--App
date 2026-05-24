"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import {
  calculateLagToTapInScore,
  LAG_TO_TAP_IN_DISTANCES,
} from "@/lib/practice/games";
import { savePracticeSession } from "@/app/actions";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";

type BallScore = 5 | 3 | 1 | 0;

const scoreOptions: { value: BallScore; label: string; detail: string }[] = [
  { value: 5, label: "Inside 2 ft", detail: "Tap-in — perfect speed" },
  { value: 3, label: "Inside 4 ft", detail: "Comfortable second putt" },
  { value: 1, label: "Inside 6 ft", detail: "Workable but stress" },
  { value: 0, label: "Outside 6 ft", detail: "Three-putt territory" },
];

export default function LagToTapInGame() {
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const sessionStartedAtRef = useSessionStartedAt(phase === "playing");
  const [scores, setScores] = useState<BallScore[]>([]);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const isComplete = scores.length === LAG_TO_TAP_IN_DISTANCES.length;
  const currentDist = LAG_TO_TAP_IN_DISTANCES[scores.length];

  useEffect(() => {
    if (isComplete) markUserHasPracticed();
  }, [isComplete]);

  function record(score: BallScore) {
    const next = [...scores, score];
    setScores(next);
    if (next.length === LAG_TO_TAP_IN_DISTANCES.length) {
      const result = calculateLagToTapInScore(next);
      toast.success(`Complete — ${result.total}/${result.max} pts`);
    } else if (restInterval > 0) {
      setIsResting(true);
    }
  }

  function resetGame() {
    setScores([]);
    setPhase("setup");
  }

  async function saveSession() {
    const result = calculateLagToTapInScore(scores);
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await savePracticeSession({
      type: "game",
      title: "Lag to Tap-In",
      ...timing,
      config: { gameId: "lag-to-tap-in", scores },
      score: result.total,
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
        <h1 className="text-3xl font-semibold tracking-tighter mb-2">Lag to Tap-In</h1>
        <p className="text-muted-foreground mb-8">Six long putts. Score the leave — speed beats line on lags.</p>
        <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
        <Button size="lg" className="w-full h-14 mt-6" onClick={() => setPhase("playing")}>Start</Button>
      </div>
    );
  }

  const result = calculateLagToTapInScore(scores);

  return (
    <>
      {isResting && <RestBetweenShots seconds={restInterval} onComplete={() => setIsResting(false)} />}
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>

        {!isComplete && (
          <div className="mb-8">
            <div className="text-center mb-4">
              <div className="text-5xl font-semibold tabular-nums">{currentDist}</div>
              <div className="text-muted-foreground">Putt {scores.length + 1} of {LAG_TO_TAP_IN_DISTANCES.length}</div>
            </div>
            <div className="space-y-2.5">
              {scoreOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => record(opt.value)}
                  className="w-full min-h-[56px] rounded-2xl border bg-card px-5 text-left flex justify-between items-center hover:bg-muted active:scale-[0.985] transition"
                >
                  <div>
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.detail}</div>
                  </div>
                  <span className="text-xl font-bold tabular-nums">+{opt.value}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-6">
            <div className="text-center py-6 bg-card rounded-2xl border">
              <div className="text-6xl font-semibold text-accent tabular-nums">{result.total}<span className="text-3xl text-muted-foreground">/30</span></div>
              <div className="text-lg mt-1">{result.percentage}% leave quality</div>
            </div>
            <div className="flex gap-3">
              <Button onClick={resetGame} variant="outline" size="lg" className="flex-1"><RotateCcw className="mr-2 h-4 w-4" /> Again</Button>
              <Button onClick={saveSession} size="lg" className="flex-1"><Save className="mr-2 h-4 w-4" /> Save</Button>
            </div>
            <Link href="/practice/games"><Button variant="ghost" className="w-full">Back to Games</Button></Link>
          </div>
        )}
      </div>
    </>
  );
}
