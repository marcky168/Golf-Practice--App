"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { calculateBumpAndRunScore } from "@/lib/practice/games";
import { saveGameSession } from "@/lib/practice/save-game-session";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { GameScoreCompare } from "@/components/practice/GameScoreCompare";
import { ShortGameClubPicker } from "@/components/practice/ShortGameClubPicker";
import { useGamePersonalBest } from "@/components/practice/useGamePersonalBest";
import { getClubBag, type ClubEntry } from "@/app/actions";
import { isBumpRunClub } from "@/lib/practice/short-game-clubs";

const LIES = [
  { label: "Fringe bump", detail: "12 yd · low runner off the collar" },
  { label: "Fairway bump", detail: "18 yd · firm ground, plenty of green" },
  { label: "Tight lie", detail: "22 yd · clean contact, minimal loft" },
  { label: "Downhill run", detail: "16 yd · let it release downhill" },
  { label: "Light rough", detail: "14 yd · pick it clean, still run it" },
  { label: "Uphill bump", detail: "20 yd · extra carry, then release" },
] as const;

type LieResult = {
  lie: string;
  detail: string;
  inside8ft: boolean;
  shape?: ShapeType;
  trajectory?: TrajectoryType;
};

export default function BumpAndRunBlitzGame() {
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const sessionStartedAtRef = useSessionStartedAt(phase === "playing");
  const [bagLoading, setBagLoading] = useState(true);
  const [clubBag, setClubBag] = useState<ClubEntry[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubEntry | null>(null);
  const [customClub, setCustomClub] = useState("");
  const [results, setResults] = useState<LieResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
  const [pendingTrajectory, setPendingTrajectory] = useState<TrajectoryType | null>(null);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const bumpRunBag = clubBag.filter(isBumpRunClub);
  const effectiveClub = (selectedClub?.club ?? customClub) || "Club";
  const { personalBest, noteSavedScore, personalBestReady } = useGamePersonalBest("bump-and-run-blitz", effectiveClub);

  const currentLie = LIES[currentIndex];
  const intentionReady = pendingShape !== null && pendingTrajectory !== null;
  const isComplete = results.length === LIES.length;
  const progress = (results.length / LIES.length) * 100;

  useEffect(() => {
    getClubBag().then((bag) => {
      setClubBag(bag);
      const options = bag.filter(isBumpRunClub);
      if (options.length > 0) setSelectedClub(options[0]);
      setBagLoading(false);
    });
  }, []);

  function recordResult(inside8ft: boolean) {
    if (!intentionReady) return;
    const entry: LieResult = {
      lie: currentLie.label,
      detail: currentLie.detail,
      inside8ft,
      shape: pendingShape ?? undefined,
      trajectory: pendingTrajectory ?? undefined,
    };
    setPendingShape(null);
    setPendingTrajectory(null);
    const next = [...results, entry];
    setResults(next);

    if (next.length === LIES.length) {
      markUserHasPracticed();
      const { made } = calculateBumpAndRunScore(next.map((r) => r.inside8ft));
      toast.success(`${made}/6 inside 8 ft — bump-and-run complete.`);
    } else {
      setCurrentIndex(currentIndex + 1);
      if (restInterval > 0) setIsResting(true);
    }
  }

  function resetGame() {
    setResults([]);
    setCurrentIndex(0);
    setPhase("setup");
  }

  async function saveSession() {
    const summary = calculateBumpAndRunScore(results.map((r) => r.inside8ft));
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await saveGameSession({
      type: "game",
      title: `Bump-and-Run Blitz — ${effectiveClub}`,
      ...timing,
      config: { gameId: "bump-and-run-blitz", club: effectiveClub, results, summary },
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
        <div className="flex items-center gap-3 mb-2">
          <Target className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tighter">Bump-and-Run Blitz</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Six low-runner lies. Finish inside 8 feet — no putting, just honest chip leaves.
        </p>

        <div className="bg-muted/40 rounded-xl p-4 text-sm mb-8 space-y-2">
          {LIES.map((lie, i) => (
            <div key={lie.label} className="flex gap-2">
              <span className="text-muted-foreground shrink-0">{i + 1}.</span>
              <span><strong>{lie.label}</strong> — {lie.detail}</span>
            </div>
          ))}
        </div>

        <ShortGameClubPicker
          label="Club for bump-and-runs"
          bagLoading={bagLoading}
          clubs={bumpRunBag}
          selectedClub={selectedClub}
          customClub={customClub}
          onSelectClub={(entry) => { setSelectedClub(entry); setCustomClub(""); }}
          onCustomClub={(value) => { setCustomClub(value); setSelectedClub(null); }}
          gameId="bump-and-run-blitz"
          personalBest={personalBest}
          personalBestReady={personalBestReady}
        />

        <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
        <Button
          size="lg"
          className="w-full h-14 text-lg mt-6"
          disabled={!(selectedClub || customClub)}
          onClick={() => setPhase("playing")}
        >
          Start Blitz
        </Button>
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
          <h1 className="text-3xl font-semibold tracking-tighter">Bump-and-Run Blitz</h1>
        </div>

        <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-3 mb-6 text-center text-sm font-semibold">
          {effectiveClub}
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium mb-1.5">
            <span>Lie {currentIndex + 1} of {LIES.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-2 bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {!isComplete && (
          <div className="mb-8">
            <div className="bg-card border rounded-2xl p-6 mb-6">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Current lie</div>
              <div className="text-2xl font-semibold">{currentLie.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{currentLie.detail}</div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Low-runner intention</div>
              <IntentionPicker
                shape={pendingShape}
                trajectory={pendingTrajectory}
                onShape={setPendingShape}
                onTrajectory={setPendingTrajectory}
              />
            </div>

            <div className={`text-sm text-center mb-3 ${intentionReady ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
              {intentionReady ? "Inside 8 feet of the hole?" : "Set your intention first ↑"}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="h-16 text-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
                disabled={!intentionReady}
                onClick={() => recordResult(true)}
              >
                Yes — inside 8 ft
              </Button>
              <Button
                size="lg"
                variant="destructive"
                className="h-16 text-lg disabled:opacity-40"
                disabled={!intentionReady}
                onClick={() => recordResult(false)}
              >
                No — missed
              </Button>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-6">
            {(() => {
              const summary = calculateBumpAndRunScore(results.map((r) => r.inside8ft));
              return (
                <>
                  <div className="text-center py-6 bg-card rounded-2xl border">
                    <div className="text-6xl font-semibold text-emerald-600 tabular-nums">
                      {summary.made}/{summary.total}
                    </div>
                    <div className="text-xl mt-1">inside 8 feet</div>
                    <div className="text-sm text-muted-foreground mt-1">{summary.percentage}% success</div>
                  </div>

                  <GameScoreCompare
                    gameId="bump-and-run-blitz"
                    score={summary.made}
                    personalBest={personalBest}
                    personalBestReady={personalBestReady}
                    clubLabel={effectiveClub}
                  />

                  <div className="bg-card border rounded-2xl p-5 text-sm">
                    {results.map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0 gap-2">
                        <div className="min-w-0">
                          <div className="font-medium">{r.lie}</div>
                          <div className="text-xs text-muted-foreground">{r.shape} · {r.trajectory}</div>
                        </div>
                        <span className={`shrink-0 font-medium ${r.inside8ft ? "text-emerald-600" : "text-red-500"}`}>
                          {r.inside8ft ? "Made" : "Missed"}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

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
