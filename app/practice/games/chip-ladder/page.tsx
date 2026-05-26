"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { calculateChipLadderScore, CHIP_LADDER_DISTANCES } from "@/lib/practice/games";
import { getClubBag, type ClubEntry } from "@/app/actions";
import { saveGameSession } from "@/lib/practice/save-game-session";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { GameScoreCompare } from "@/components/practice/GameScoreCompare";
import { ShortGameClubPicker } from "@/components/practice/ShortGameClubPicker";
import { useGamePersonalBest } from "@/components/practice/useGamePersonalBest";
import { isWedgeClub } from "@/lib/practice/short-game-clubs";

type BallScore = 5 | 3 | 1 | 0;

const scoreOptions: { value: BallScore; label: string; detail: string }[] = [
  { value: 5, label: "Inside 3 ft", detail: "Tap-in territory" },
  { value: 3, label: "Inside 6 ft", detail: "Solid leave" },
  { value: 1, label: "Inside 10 ft", detail: "On green, workable" },
  { value: 0, label: "Outside 10 ft", detail: "Miss or poor leave" },
];

export default function ChipLadderGame() {
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const sessionStartedAtRef = useSessionStartedAt(phase === "playing");
  const [bagLoading, setBagLoading] = useState(true);
  const [clubBag, setClubBag] = useState<ClubEntry[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubEntry | null>(null);
  const [customClub, setCustomClub] = useState("");
  const [sessionShape, setSessionShape] = useState<ShapeType | null>(null);
  const [sessionTrajectory, setSessionTrajectory] = useState<TrajectoryType | null>(null);
  const [results, setResults] = useState<BallScore[][]>([[], [], [], []]);
  const [currentDistanceIndex, setCurrentDistanceIndex] = useState(0);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const wedgeBag = clubBag.filter(isWedgeClub);
  const effectiveClub = (selectedClub?.club ?? customClub) || "Wedge";
  const { personalBest, noteSavedScore, personalBestReady } = useGamePersonalBest("chip-ladder", effectiveClub);
  const intentionSet = sessionShape !== null && sessionTrajectory !== null;
  const isComplete = results.every((d) => d.length === 3);
  const currentDist = CHIP_LADDER_DISTANCES[currentDistanceIndex];
  const ballsAtCurrent = results[currentDistanceIndex].length;
  const progress = (results.flat().length / 12) * 100;

  useEffect(() => {
    getClubBag().then((bag) => {
      setClubBag(bag);
      const wedges = bag.filter(isWedgeClub);
      if (wedges.length > 0) setSelectedClub(wedges[0]);
      setBagLoading(false);
    });
  }, []);

  useEffect(() => {
    if (isComplete) markUserHasPracticed();
  }, [isComplete]);

  function recordBall(score: BallScore) {
    const newResults = [...results];
    newResults[currentDistanceIndex] = [...newResults[currentDistanceIndex], score];
    setResults(newResults);

    if (ballsAtCurrent + 1 < 3) {
      if (restInterval > 0) setIsResting(true);
    } else if (currentDistanceIndex < CHIP_LADDER_DISTANCES.length - 1) {
      setCurrentDistanceIndex(currentDistanceIndex + 1);
      if (restInterval > 0) setIsResting(true);
    } else {
      const final = calculateChipLadderScore(newResults);
      toast.success(`Chip ladder complete — ${final.total}/${final.max} pts`);
    }
  }

  function resetGame() {
    setResults([[], [], [], []]);
    setCurrentDistanceIndex(0);
    setPhase("setup");
  }

  async function saveSession() {
    const result = calculateChipLadderScore(results);
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await saveGameSession({
      type: "game",
      title: `Chip Ladder — ${effectiveClub}`,
      ...timing,
      config: {
        gameId: "chip-ladder",
        club: effectiveClub,
        shape: sessionShape,
        trajectory: sessionTrajectory,
        results,
      },
      score: result.total,
    }, noteSavedScore);
    if (res.success) toast.success("Game saved!");
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
          <h1 className="text-3xl font-semibold tracking-tighter">Chip Ladder</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          3 chips each at 10, 15, 20, and 25 yards. Score every finish honestly.
        </p>

        <div className="space-y-6">
          <ShortGameClubPicker
            bagLoading={bagLoading}
            clubs={wedgeBag}
            selectedClub={selectedClub}
            customClub={customClub}
            onSelectClub={(entry) => { setSelectedClub(entry); setCustomClub(""); }}
            onCustomClub={(value) => { setCustomClub(value); setSelectedClub(null); }}
            gameId="chip-ladder"
            personalBest={personalBest}
            personalBestReady={personalBestReady}
          />

          <div>
            <div className="text-sm font-semibold mb-1">Shot intention</div>
            <p className="text-xs text-muted-foreground mb-3">Set once — same shape/flight for all 12 chips.</p>
            <IntentionPicker
              shape={sessionShape}
              trajectory={sessionTrajectory}
              onShape={setSessionShape}
              onTrajectory={setSessionTrajectory}
            />
          </div>

          <RestIntervalSelector value={restInterval} onChange={setRestInterval} />

          <Button
            size="lg"
            className="w-full h-14 text-lg"
            disabled={!(selectedClub || customClub) || !intentionSet}
            onClick={() => setPhase("playing")}
          >
            Start Chip Ladder
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

        <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-3 mb-6 text-center text-sm font-semibold">
          {effectiveClub} · {sessionShape} · {sessionTrajectory}
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1.5 font-medium">
            <div>{currentDist} — Chip {ballsAtCurrent + 1} of 3</div>
            <div>{Math.round(progress)}%</div>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-2 bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {!isComplete && (
          <div className="mb-8">
            <div className="text-center mb-4">
              <div className="text-5xl font-semibold tabular-nums tracking-tighter">{currentDist}</div>
              <div className="text-muted-foreground">to the pin</div>
            </div>

            <div className="text-xs uppercase tracking-widest text-center text-muted-foreground mb-3">
              Where did the ball finish?
            </div>

            <div className="space-y-2.5">
              {scoreOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => recordBall(opt.value)}
                  className="w-full min-h-[56px] rounded-2xl border bg-card text-left px-6 active:bg-accent active:text-white hover:bg-muted transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-base font-semibold">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.detail}</div>
                  </div>
                  <span className="font-semibold tabular-nums text-xl">+{opt.value}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-6">
            {(() => {
              const result = calculateChipLadderScore(results);
              return (
                <>
                  <div className="text-center py-6 bg-card rounded-2xl border">
                    <div className="text-6xl font-semibold tracking-tighter text-accent tabular-nums">
                      {result.total}
                    </div>
                    <div className="text-xl mt-1">out of {result.max} points</div>
                  </div>

                  <GameScoreCompare
                    gameId="chip-ladder"
                    score={result.total}
                    personalBest={personalBest}
                    personalBestReady={personalBestReady}
                    clubLabel={effectiveClub}
                  />

                  <div className="bg-card border rounded-2xl p-5">
                    <div className="font-medium mb-3">By distance</div>
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

        {!isComplete && (
          <div className="mt-8 text-center text-xs text-muted-foreground">
            {CHIP_LADDER_DISTANCES.map((d, i) => (
              <span key={d} className={i === currentDistanceIndex ? "font-bold text-foreground" : ""}>
                {d}{i < CHIP_LADDER_DISTANCES.length - 1 ? " → " : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
