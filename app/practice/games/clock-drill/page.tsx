"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { calculateBinaryCircuitScore, CLOCK_POSITIONS } from "@/lib/practice/games";
import { saveGameSession } from "@/lib/practice/save-game-session";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";
import { GameScoreCompare } from "@/components/practice/GameScoreCompare";
import { useGamePersonalBest } from "@/components/practice/useGamePersonalBest";

export default function ClockDrillGame() {
  const { personalBest, noteSavedScore, personalBestReady } = useGamePersonalBest("clock-drill");
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const sessionStartedAtRef = useSessionStartedAt(phase === "playing");
  const [results, setResults] = useState<boolean[]>([]);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const current = CLOCK_POSITIONS[results.length];
  const isComplete = results.length === CLOCK_POSITIONS.length;

  function record(made: boolean) {
    const next = [...results, made];
    setResults(next);
    if (next.length === CLOCK_POSITIONS.length) {
      markUserHasPracticed();
      const { made: count } = calculateBinaryCircuitScore(next);
      toast.success(count === 4 ? "Perfect clock — 4/4!" : `${count}/4 around the clock.`);
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
    const res = await saveGameSession({
      type: "game",
      title: "Clock Drill",
      ...timing,
      config: { gameId: "clock-drill", results },
      score: summary.made,
    }, noteSavedScore);
    if (res.success) toast.success("Saved!");
    else toast.error("Save failed");
  }

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>
        <h1 className="text-3xl font-semibold tracking-tighter mb-2">Clock Drill</h1>
        <p className="text-muted-foreground mb-6">Four 3-foot putts around the hole. Move clockwise after each rep.</p>
        <div className="bg-muted/40 rounded-xl p-4 text-sm mb-8 space-y-2">
          {CLOCK_POSITIONS.map((p, i) => (
            <div key={p.label}><strong>{i + 1}. {p.label}</strong> — {p.detail}</div>
          ))}
        </div>
        <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
        <Button size="lg" className="w-full h-14 mt-6" onClick={() => setPhase("playing")}>Start Clock</Button>
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

        {!isComplete && current && (
          <div className="mb-8">
            <div className="bg-card border rounded-2xl p-6 mb-6 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Position {results.length + 1} of 4</div>
              <div className="text-2xl font-semibold">{current.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{current.detail}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" className="h-16 text-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => record(true)}>Made</Button>
              <Button size="lg" variant="destructive" className="h-16 text-xl" onClick={() => record(false)}>Missed</Button>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-6">
            <div className="text-center py-6 bg-card rounded-2xl border">
              <div className="text-6xl font-semibold text-accent tabular-nums">{summary.made}/4</div>
              <div className="text-xl mt-1">clock complete</div>
            </div>

            <GameScoreCompare gameId="clock-drill" score={summary.made} personalBest={personalBest} personalBestReady={personalBestReady} />

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
