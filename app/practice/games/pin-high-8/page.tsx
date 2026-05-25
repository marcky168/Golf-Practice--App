"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { calculatePinHighScore, PIN_HIGH_YARDAGES } from "@/lib/practice/games";
import { getClubBag, type ClubEntry } from "@/app/actions";
import { saveGameSession } from "@/lib/practice/save-game-session";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { GameScoreCompare } from "@/components/practice/GameScoreCompare";
import { useGamePersonalBest } from "@/components/practice/useGamePersonalBest";

type ShotScore = 5 | 4 | 3 | 1 | 0;

const scoreLabels: Record<ShotScore, { label: string; detail: string }> = {
  5: { label: "Pin high + inside 6 ft", detail: "Tour leave" },
  4: { label: "Pin high", detail: "Correct depth, good line" },
  3: { label: "On green", detail: "Long or short of pin-high" },
  1: { label: "Edge of green", detail: "Workable but poor" },
  0: { label: "Miss", detail: "Off green or chunk/skull" },
};

function isPitchClub(entry: ClubEntry): boolean {
  return entry.carry >= 35 && entry.carry <= 130;
}

export default function PinHigh8Game() {
  const { personalBest, noteSavedScore, personalBestReady } = useGamePersonalBest("pin-high-8");
  const [hasStarted, setHasStarted] = useState(false);
  const sessionStartedAtRef = useSessionStartedAt(hasStarted);
  const [bagLoading, setBagLoading] = useState(true);
  const [clubBag, setClubBag] = useState<ClubEntry[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubEntry | null>(null);
  const [customClub, setCustomClub] = useState("");
  const [sessionShape, setSessionShape] = useState<ShapeType | null>(null);
  const [sessionTrajectory, setSessionTrajectory] = useState<TrajectoryType | null>(null);
  const [scores, setScores] = useState<ShotScore[]>([]);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const pitchBag = clubBag.filter(isPitchClub);
  const effectiveClub = (selectedClub?.club ?? customClub) || "Wedge";
  const intentionSet = sessionShape !== null && sessionTrajectory !== null;
  const isComplete = scores.length === PIN_HIGH_YARDAGES.length;
  const currentYards = PIN_HIGH_YARDAGES[scores.length];

  useEffect(() => {
    getClubBag().then((bag) => {
      setClubBag(bag);
      const options = bag.filter(isPitchClub);
      if (options.length > 0) setSelectedClub(options[0]);
      setBagLoading(false);
    });
  }, []);

  function recordShot(score: ShotScore) {
    const next = [...scores, score];
    setScores(next);
    if (next.length === PIN_HIGH_YARDAGES.length) {
      markUserHasPracticed();
      const result = calculatePinHighScore(next);
      toast.success(`${result.total}/${result.max} pts — pin-high complete`);
    } else if (restInterval > 0) {
      setIsResting(true);
    }
  }

  function resetGame() {
    setHasStarted(false);
    setScores([]);
  }

  async function saveSession() {
    const result = calculatePinHighScore(scores);
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await saveGameSession({
      type: "game",
      title: `Pin High 8 — ${effectiveClub}`,
      ...timing,
      config: { gameId: "pin-high-8", club: effectiveClub, scores, yardages: [...PIN_HIGH_YARDAGES] },
      score: result.total,
    }, noteSavedScore);
    if (res.success) toast.success("Saved!");
    else toast.error("Save failed");
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>
        <h1 className="text-3xl font-semibold tracking-tighter mb-2">Pin High 8</h1>
        <p className="text-muted-foreground mb-6">Eight pitches from varied yardages. Depth beats direction on approaches.</p>
        <div className="text-sm bg-muted/40 rounded-xl p-4 mb-6">
          Yardages: {PIN_HIGH_YARDAGES.join(" · ")} yd
        </div>
        <div className="space-y-6">
          <div>
            <div className="text-sm font-semibold mb-2">Club</div>
            {bagLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-wrap gap-2">
                {(pitchBag.length > 0 ? pitchBag : clubBag).slice(0, 8).map((entry) => (
                  <button key={entry.club} type="button" onClick={() => { setSelectedClub(entry); setCustomClub(""); }}
                    className={`px-4 py-2 rounded-full border text-sm ${selectedClub?.club === entry.club ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                    {entry.club}
                  </button>
                ))}
              </div>
            )}
          </div>
          <IntentionPicker shape={sessionShape} trajectory={sessionTrajectory} onShape={setSessionShape} onTrajectory={setSessionTrajectory} />
          <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
          <Button size="lg" className="w-full h-14" disabled={!(selectedClub || customClub) || !intentionSet} onClick={() => setHasStarted(true)}>
            Start 8 Pitches
          </Button>
        </div>
      </div>
    );
  }

  if (!isComplete) {
    return (
      <>
        {isResting && <RestBetweenShots seconds={restInterval} onComplete={() => setIsResting(false)} />}
        <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
          <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Games
          </Link>
          <div className="text-center mb-6">
            <div className="text-5xl font-semibold tabular-nums">{currentYards} yd</div>
            <div className="text-muted-foreground">Pitch {scores.length + 1} of 8 · {effectiveClub}</div>
          </div>
          <div className="space-y-2.5">
            {([5, 4, 3, 1, 0] as const).map((score) => (
              <button key={score} type="button" onClick={() => recordShot(score)}
                className="w-full min-h-[56px] rounded-2xl border bg-card px-5 flex justify-between items-center hover:bg-muted transition">
                <div><div className="font-semibold">{scoreLabels[score].label}</div><div className="text-xs text-muted-foreground">{scoreLabels[score].detail}</div></div>
                <span className="text-xl font-bold">+{score}</span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  const result = calculatePinHighScore(scores);

  return (
    <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
      <div className="text-center py-6 bg-card rounded-2xl border mb-6">
        <div className="text-6xl font-semibold text-accent tabular-nums">{result.total}<span className="text-3xl text-muted-foreground">/40</span></div>
        <div className="text-lg mt-1">{result.percentage}% pin-high quality</div>
      </div>

      <GameScoreCompare gameId="pin-high-8" score={result.total} personalBest={personalBest} personalBestReady={personalBestReady} />

      <div className="flex gap-3 mb-3">
        <Button onClick={resetGame} variant="outline" size="lg" className="flex-1"><RotateCcw className="mr-2 h-4 w-4" /> Again</Button>
        <Button onClick={saveSession} size="lg" className="flex-1"><Save className="mr-2 h-4 w-4" /> Save</Button>
      </div>
      <Link href="/practice/games"><Button variant="ghost" className="w-full">Back to Games</Button></Link>
    </div>
  );
}
