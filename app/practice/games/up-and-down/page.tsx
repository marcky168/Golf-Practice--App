"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { savePracticeSession } from "@/app/actions";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";

const lies = [
  "Tight lie, 15 yards",
  "Light rough, 22 yards",
  "Uphill lie, 18 yards",
  "Bunker, 12 yards",
  "Downhill lie, 28 yards",
  "Fringe, 8 yards",
];

type UpDownResult = {
  lie: string;
  upAndDown: boolean;
  shape?: ShapeType;
  trajectory?: TrajectoryType;
};

export default function UpAndDownScramble() {
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const sessionStartedAtRef = useSessionStartedAt(phase === "playing");
  const [results, setResults] = useState<UpDownResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
  const [pendingTrajectory, setPendingTrajectory] = useState<TrajectoryType | null>(null);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const currentLie = lies[currentIndex];
  const isBunker = currentLie.toLowerCase().includes("bunker");
  const intentionReady = isBunker || (pendingShape !== null && pendingTrajectory !== null);
  const progress = (results.length / 6) * 100;

  function recordResult(success: boolean) {
    if (!intentionReady) return;
    const newResult: UpDownResult = {
      lie: currentLie,
      upAndDown: success,
      shape: isBunker ? undefined : pendingShape ?? undefined,
      trajectory: isBunker ? undefined : pendingTrajectory ?? undefined,
    };
    setPendingShape(null);
    setPendingTrajectory(null);
    const newResults = [...results, newResult];
    setResults(newResults);

    if (newResults.length === 6) {
      setIsComplete(true);
      const made = newResults.filter(r => r.upAndDown).length;
      toast.success(`${made}/6 up & downs — excellent scramble work.`);
    } else {
      setCurrentIndex(currentIndex + 1);
      if (restInterval > 0) setIsResting(true);
    }
  }

  function resetGame() {
    setResults([]);
    setCurrentIndex(0);
    setIsComplete(false);
  }

  async function saveSession() {
    const made = results.filter(r => r.upAndDown).length;
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await savePracticeSession({
      type: "game",
      title: "Up & Down Scramble",
      ...timing,
      config: { gameId: "up-and-down", results },
      score: made,
    });
    if (res.success) toast.success("Saved!");
    else toast.error("Save failed");
  }

  const madeCount = results.filter(r => r.upAndDown).length;

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Target className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tighter">Up &amp; Down Scramble</h1>
        </div>
        <p className="text-muted-foreground mb-8">6 realistic lies. Chip or pitch + one putt. Goal: get up and down every time.</p>
        <div className="space-y-6">
          <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
          <Button size="lg" className="w-full h-14 text-lg" onClick={() => setPhase("playing")}>
            Start Challenge
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
        <h1 className="text-3xl font-semibold tracking-tighter">Up &amp; Down Scramble</h1>
      </div>
      <p className="text-muted-foreground mb-6">6 realistic lies. Chip or pitch + one putt. Goal: get up and down every time.</p>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1.5 font-medium">
          <div>Lie {currentIndex + 1} of 6</div>
          <div>{Math.round(progress)}%</div>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-2 bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!isComplete && (
        <div className="mb-8">
          <div className="bg-card border rounded-2xl p-6 mb-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Current lie</div>
            <div className="text-2xl font-semibold">{currentLie}</div>
          </div>

          {isBunker ? (
            <div className="bg-muted/40 border rounded-xl px-4 py-2.5 text-xs text-center text-muted-foreground mb-4">
              Sand shot — no shape/trajectory intention needed
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

          <div className={`text-sm text-center mb-3 transition ${intentionReady ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
            {intentionReady ? "Did you get up and down?" : "Set your intention first ↑"}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-16 text-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
              onClick={() => recordResult(true)}
              disabled={!intentionReady}
            >
              Yes — Up &amp; Down
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-16 text-xl disabled:opacity-40"
              onClick={() => recordResult(false)}
              disabled={!intentionReady}
            >
              No — Missed
            </Button>
          </div>
        </div>
      )}

      {isComplete && (
        <div className="space-y-6">
          <div className="text-center py-6 bg-card rounded-2xl border">
            <div className="text-6xl font-semibold tracking-tighter text-emerald-600 tabular-nums">
              {madeCount}/6
            </div>
            <div className="text-xl mt-1">up and downs made</div>
          </div>

          <div className="bg-card border rounded-2xl p-5 text-sm">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0 gap-2">
                <div className="min-w-0">
                  <div>{r.lie}</div>
                  {r.shape && (
                    <div className="text-xs text-muted-foreground">{r.shape} · {r.trajectory}</div>
                  )}
                </div>
                <span className={`shrink-0 font-medium ${r.upAndDown ? "text-emerald-600" : "text-red-500"}`}>
                  {r.upAndDown ? "Made" : "Missed"}
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

          <Link href="/practice/games">
            <Button variant="ghost" className="w-full">Back to Games</Button>
          </Link>
        </div>
      )}
    </div>
    </>
  );
}
