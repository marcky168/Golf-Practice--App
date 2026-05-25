"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { calculateWedgeWindowScore, WEDGE_WINDOW_SHOTS } from "@/lib/practice/games";
import { getClubBag, type ClubEntry } from "@/app/actions";
import { saveGameSession } from "@/lib/practice/save-game-session";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { GameScoreCompare } from "@/components/practice/GameScoreCompare";
import { useGamePersonalBest } from "@/components/practice/useGamePersonalBest";

type ShotResult = {
  yards: number;
  trajectory: string;
  hit: boolean;
  shape?: ShapeType;
  trajectoryType?: TrajectoryType;
};

function isPitchClub(entry: ClubEntry): boolean {
  return entry.carry >= 35 && entry.carry <= 130;
}

export default function WedgeWindow6Game() {
  const { personalBest, noteSavedScore, personalBestReady } = useGamePersonalBest("wedge-window-6");
  const [phase, setPhase] = useState<"setup" | "playing">("setup");
  const sessionStartedAtRef = useSessionStartedAt(phase === "playing");
  const [bagLoading, setBagLoading] = useState(true);
  const [clubBag, setClubBag] = useState<ClubEntry[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubEntry | null>(null);
  const [customClub, setCustomClub] = useState("");
  const [results, setResults] = useState<ShotResult[]>([]);
  const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
  const [pendingTrajectory, setPendingTrajectory] = useState<TrajectoryType | null>(null);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const pitchBag = clubBag.filter(isPitchClub);
  const effectiveClub = (selectedClub?.club ?? customClub) || "Wedge";
  const currentShot = WEDGE_WINDOW_SHOTS[results.length];
  const isComplete = results.length === WEDGE_WINDOW_SHOTS.length;
  const intentionReady = pendingShape !== null && pendingTrajectory !== null;

  useEffect(() => {
    getClubBag().then((bag) => {
      setClubBag(bag);
      const options = bag.filter(isPitchClub);
      if (options.length > 0) setSelectedClub(options[0]);
      setBagLoading(false);
    });
  }, []);

  function record(hit: boolean) {
    if (!intentionReady || !currentShot) return;
    const entry: ShotResult = {
      yards: currentShot.yards,
      trajectory: currentShot.trajectory,
      hit,
      shape: pendingShape ?? undefined,
      trajectoryType: pendingTrajectory ?? undefined,
    };
    setPendingShape(null);
    setPendingTrajectory(null);
    const next = [...results, entry];
    setResults(next);

    if (next.length === WEDGE_WINDOW_SHOTS.length) {
      markUserHasPracticed();
      const { made } = calculateWedgeWindowScore(next.map((r) => r.hit));
      toast.success(`${made}/6 pin-high windows hit.`);
    } else if (restInterval > 0) {
      setIsResting(true);
    }
  }

  function resetGame() {
    setResults([]);
    setPhase("setup");
  }

  async function saveSession() {
    const summary = calculateWedgeWindowScore(results.map((r) => r.hit));
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await saveGameSession({
      type: "game",
      title: `Wedge Window 6 — ${effectiveClub}`,
      ...timing,
      config: { gameId: "wedge-window-6", club: effectiveClub, results },
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
        <h1 className="text-3xl font-semibold tracking-tighter mb-2">Wedge Window 6</h1>
        <p className="text-muted-foreground mb-6">High, mid, and low trajectories at 50 and 65 yards. On the green, pin-high = hit.</p>
        <div className="bg-muted/40 rounded-xl p-4 text-sm mb-8 space-y-2">
          {WEDGE_WINDOW_SHOTS.map((s, i) => (
            <div key={i}><strong>{s.trajectory} · {s.yards} yd</strong> — {s.detail}</div>
          ))}
        </div>
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2">Club</div>
          {bagLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <div className="flex flex-wrap gap-2">
              {pitchBag.map((entry) => (
                <button key={entry.club} type="button" onClick={() => { setSelectedClub(entry); setCustomClub(""); }}
                  className={`px-4 py-2 rounded-full border text-sm ${selectedClub?.club === entry.club ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  {entry.club}
                </button>
              ))}
            </div>
          )}
        </div>
        <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
        <Button size="lg" className="w-full h-14 mt-6" disabled={!(selectedClub || customClub)} onClick={() => setPhase("playing")}>
          Start Window Test
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

        {!isComplete && currentShot && (
          <div className="mb-8">
            <div className="bg-card border rounded-2xl p-6 mb-6 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Shot {results.length + 1} of 6</div>
              <div className="text-3xl font-semibold tabular-nums">{currentShot.yards} yd</div>
              <div className="text-lg font-medium mt-1">{currentShot.trajectory} trajectory</div>
              <div className="text-sm text-muted-foreground mt-2">{currentShot.detail}</div>
              <div className="text-xs text-muted-foreground mt-3">{effectiveClub}</div>
            </div>
            <IntentionPicker shape={pendingShape} trajectory={pendingTrajectory} onShape={setPendingShape} onTrajectory={setPendingTrajectory} />
            <div className={`text-sm text-center my-4 ${intentionReady ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
              {intentionReady ? "On green + pin-high?" : "Set intention first ↑"}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" className="h-16 text-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40" disabled={!intentionReady} onClick={() => record(true)}>
                Hit window
              </Button>
              <Button size="lg" variant="destructive" className="h-16 text-lg disabled:opacity-40" disabled={!intentionReady} onClick={() => record(false)}>
                Missed
              </Button>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="space-y-6">
            {(() => {
              const summary = calculateWedgeWindowScore(results.map((r) => r.hit));
              return (
                <>
                  <div className="text-center py-6 bg-card rounded-2xl border">
                    <div className="text-6xl font-semibold text-emerald-600 tabular-nums">{summary.made}/6</div>
                    <div className="text-xl mt-1">pin-high windows</div>
                  </div>

                  <GameScoreCompare gameId="wedge-window-6" score={summary.made} personalBest={personalBest} personalBestReady={personalBestReady} />

                  <div className="bg-card border rounded-2xl p-5 text-sm">
                    {results.map((r, i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b last:border-0 gap-2">
                        <div>
                          <div>{r.trajectory} · {r.yards} yd</div>
                          <div className="text-xs text-muted-foreground">{r.shape} · {r.trajectoryType}</div>
                        </div>
                        <span className={r.hit ? "text-emerald-600 font-medium" : "text-red-500"}>{r.hit ? "Hit" : "Miss"}</span>
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
