"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  calculatePitchLadderScore,
  PITCH_LADDER_DISTANCES,
} from "@/lib/practice/games";
import { savePracticeSession, getClubBag, type ClubEntry } from "@/app/actions";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";

type BallScore = 5 | 3 | 1 | 0;

const scoreOptions: { value: BallScore; label: string; detail: string }[] = [
  { value: 5, label: "Inside 3 ft", detail: "Tap-in leave" },
  { value: 3, label: "Inside 6 ft", detail: "Solid pitch" },
  { value: 1, label: "Inside 10 ft", detail: "On green, workable" },
  { value: 0, label: "Outside 10 ft", detail: "Miss or poor leave" },
];

function isPitchClub(entry: ClubEntry): boolean {
  return entry.carry >= 35 && entry.carry <= 130;
}

export default function PitchLadderGame() {
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

  const pitchBag = clubBag.filter(isPitchClub);
  const effectiveClub = (selectedClub?.club ?? customClub) || "Wedge";
  const intentionSet = sessionShape !== null && sessionTrajectory !== null;
  const isComplete = results.every((d) => d.length === 3);
  const currentDist = PITCH_LADDER_DISTANCES[currentDistanceIndex];
  const ballsAtCurrent = results[currentDistanceIndex].length;

  useEffect(() => {
    getClubBag().then((bag) => {
      setClubBag(bag);
      const options = bag.filter(isPitchClub);
      if (options.length > 0) setSelectedClub(options[0]);
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
    } else if (currentDistanceIndex < PITCH_LADDER_DISTANCES.length - 1) {
      setCurrentDistanceIndex(currentDistanceIndex + 1);
      if (restInterval > 0) setIsResting(true);
    } else {
      toast.success(`Pitch ladder — ${calculatePitchLadderScore(newResults).total} pts`);
    }
  }

  function resetGame() {
    setResults([[], [], [], []]);
    setCurrentDistanceIndex(0);
    setPhase("setup");
  }

  async function saveSession() {
    const result = calculatePitchLadderScore(results);
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await savePracticeSession({
      type: "game",
      title: `Pitch Ladder — ${effectiveClub}`,
      ...timing,
      config: {
        gameId: "pitch-ladder",
        club: effectiveClub,
        shape: sessionShape,
        trajectory: sessionTrajectory,
        results,
      },
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
        <h1 className="text-3xl font-semibold tracking-tighter mb-2">Pitch Ladder</h1>
        <p className="text-muted-foreground mb-8">40 → 50 → 60 → 70 yards. Three pitches at each distance.</p>
        <div className="space-y-6">
          <div>
            <div className="text-sm font-semibold mb-2">Club</div>
            {bagLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : pitchBag.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pitchBag.map((entry) => (
                  <button
                    key={entry.club}
                    type="button"
                    onClick={() => { setSelectedClub(entry); setCustomClub(""); }}
                    className={`px-4 py-2 rounded-full border text-sm font-medium ${
                      selectedClub?.club === entry.club ? "bg-primary text-primary-foreground" : "bg-card"
                    }`}
                  >
                    {entry.club}
                  </button>
                ))}
              </div>
            ) : (
              <input value={customClub} onChange={(e) => setCustomClub(e.target.value)} className="w-full rounded-xl border bg-card px-4 py-3" placeholder="PW, 52°, GW…" />
            )}
          </div>
          <IntentionPicker shape={sessionShape} trajectory={sessionTrajectory} onShape={setSessionShape} onTrajectory={setSessionTrajectory} />
          <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
          <Button size="lg" className="w-full h-14" disabled={!(selectedClub || customClub) || !intentionSet} onClick={() => setPhase("playing")}>
            Start Pitch Ladder
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

        {!isComplete && (
          <div className="mb-8">
            <div className="text-center mb-4">
              <div className="text-5xl font-semibold tabular-nums">{currentDist}</div>
              <div className="text-muted-foreground">Pitch {ballsAtCurrent + 1} of 3</div>
            </div>
            <div className="space-y-2.5">
              {scoreOptions.map((opt) => (
                <button key={opt.value} type="button" onClick={() => recordBall(opt.value)}
                  className="w-full min-h-[56px] rounded-2xl border bg-card px-5 flex justify-between items-center hover:bg-muted transition">
                  <div><div className="font-semibold">{opt.label}</div><div className="text-xs text-muted-foreground">{opt.detail}</div></div>
                  <span className="text-xl font-bold">+{opt.value}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-6">
            {(() => {
              const result = calculatePitchLadderScore(results);
              return (
                <>
                  <div className="text-center py-6 bg-card rounded-2xl border">
                    <div className="text-6xl font-semibold text-accent tabular-nums">{result.total}</div>
                    <div className="text-xl mt-1">out of {result.max} points</div>
                  </div>
                  <div className="bg-card border rounded-2xl p-5">
                    {result.byDistance.map((d, i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b last:border-0 text-sm">
                        <span>{d.distance}</span><span className="font-semibold">{d.score} / 15</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
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
