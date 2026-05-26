"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { calculateLandingZoneScore } from "@/lib/practice/games";
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

type ShotScore = 5 | 4 | 3 | 1 | 0;

const LANDING_PRESETS = [
  "Front of green — 3 ft short of pin",
  "Middle of green — flat spot",
  "Back shelf — 5 ft past pin",
  "Left slope — feed down to hole",
  "Right slope — feed down to hole",
  "Fringe edge — run it out",
];

const scoreLabels: Record<ShotScore, { label: string; detail: string }> = {
  5: { label: "Perfect", detail: "Hit landing spot + inside 6 ft" },
  4: { label: "Landing hit", detail: "On your spot, workable putt" },
  3: { label: "Close", detail: "Near landing, inside 10 ft" },
  1: { label: "On green", detail: "Wrong line or long/short" },
  0: { label: "Miss", detail: "Off green or chunk/skull" },
};

function isWedgeOrShort(entry: ClubEntry): boolean {
  return isWedgeClub(entry);
}

export default function LandingZone8Game() {
  const [hasStarted, setHasStarted] = useState(false);
  const sessionStartedAtRef = useSessionStartedAt(hasStarted);
  const [bagLoading, setBagLoading] = useState(true);
  const [clubBag, setClubBag] = useState<ClubEntry[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubEntry | null>(null);
  const [customClub, setCustomClub] = useState("");
  const [landingSpot, setLandingSpot] = useState(LANDING_PRESETS[0]);
  const [customLanding, setCustomLanding] = useState("");
  const [useCustomLanding, setUseCustomLanding] = useState(false);
  const [sessionShape, setSessionShape] = useState<ShapeType | null>(null);
  const [sessionTrajectory, setSessionTrajectory] = useState<TrajectoryType | null>(null);
  const [scores, setScores] = useState<ShotScore[]>([]);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  const wedgeBag = clubBag.filter(isWedgeOrShort);
  const effectiveClub = (selectedClub?.club ?? customClub) || "Wedge";
  const { personalBest, noteSavedScore, personalBestReady } = useGamePersonalBest("landing-zone-8", effectiveClub);
  const effectiveLanding = useCustomLanding ? (customLanding || "Custom spot") : landingSpot;
  const intentionSet = sessionShape !== null && sessionTrajectory !== null;
  const isComplete = scores.length === 8;
  const currentShot = scores.length + 1;

  useEffect(() => {
    getClubBag().then((bag) => {
      setClubBag(bag);
      const wedges = bag.filter(isWedgeOrShort);
      if (wedges.length > 0) setSelectedClub(wedges[0]);
      setBagLoading(false);
    });
  }, []);

  function recordShot(score: ShotScore) {
    const next = [...scores, score];
    setScores(next);
    if (next.length === 8) {
      markUserHasPracticed();
      const result = calculateLandingZoneScore(next);
      toast.success(`Complete — ${result.total}/${result.max} pts (${result.percentage}%)`);
    } else if (restInterval > 0) {
      setIsResting(true);
    }
  }

  function resetGame() {
    setHasStarted(false);
    setScores([]);
    setIsResting(false);
  }

  async function saveSession() {
    const result = calculateLandingZoneScore(scores);
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await saveGameSession({
      type: "game",
      title: `Landing Zone 8 — ${effectiveClub}`,
      ...timing,
      config: {
        gameId: "landing-zone-8",
        club: effectiveClub,
        landingSpot: effectiveLanding,
        shape: sessionShape,
        trajectory: sessionTrajectory,
        scores,
        result,
      },
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
        <div className="flex items-center gap-3 mb-2">
          <Target className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tighter">Landing Zone 8</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Pick a landing spot, hit 8 chips. Score landing + finish — not just proximity hope.
        </p>

        <div className="space-y-6">
          <ShortGameClubPicker
            label="Wedge"
            bagLoading={bagLoading}
            clubs={wedgeBag}
            selectedClub={selectedClub}
            customClub={customClub}
            onSelectClub={(entry) => { setSelectedClub(entry); setCustomClub(""); }}
            onCustomClub={(value) => { setCustomClub(value); setSelectedClub(null); }}
            gameId="landing-zone-8"
            personalBest={personalBest}
            personalBestReady={personalBestReady}
          />

          <div>
            <div className="text-sm font-semibold mb-2">Landing spot</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {LANDING_PRESETS.map((spot) => (
                <button
                  key={spot}
                  type="button"
                  onClick={() => { setLandingSpot(spot); setUseCustomLanding(false); }}
                  className={`px-3 py-2 rounded-xl border text-xs text-left max-w-full ${
                    !useCustomLanding && landingSpot === spot ? "bg-accent text-accent-foreground" : "bg-card"
                  }`}
                >
                  {spot}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setUseCustomLanding(true)}
                className={`px-3 py-2 rounded-xl border text-sm ${useCustomLanding ? "bg-accent text-accent-foreground" : "bg-card"}`}
              >
                Custom…
              </button>
            </div>
            {useCustomLanding && (
              <input
                value={customLanding}
                onChange={(e) => setCustomLanding(e.target.value)}
                placeholder="Describe your landing spot…"
                className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm"
                autoFocus
              />
            )}
          </div>

          <div>
            <div className="text-sm font-semibold mb-1">Shot intention</div>
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
            className="w-full h-14"
            disabled={!(selectedClub || customClub) || !intentionSet}
            onClick={() => setHasStarted(true)}
          >
            Start 8 Chips
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

          <div className="bg-card border rounded-2xl p-5 mb-6 text-center">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Landing spot</div>
            <div className="font-semibold text-lg leading-snug">{effectiveLanding}</div>
            <div className="text-sm text-muted-foreground mt-2">{effectiveClub} · {sessionShape} · {sessionTrajectory}</div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>Chip {Math.min(currentShot, 8)} of 8</span>
              <span>{scores.length}/8</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-2 bg-accent transition-all" style={{ width: `${(scores.length / 8) * 100}%` }} />
            </div>
          </div>

          <div className="text-xs uppercase tracking-widest text-center text-muted-foreground mb-3">
            Did you hit your landing spot?
          </div>
          <div className="space-y-2.5">
            {([5, 4, 3, 1, 0] as const).map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => recordShot(score)}
                className="w-full min-h-[56px] rounded-2xl border bg-card text-left px-5 active:scale-[0.985] flex items-center justify-between hover:bg-muted transition"
              >
                <div>
                  <div className="font-semibold">{scoreLabels[score].label}</div>
                  <div className="text-xs text-muted-foreground">{scoreLabels[score].detail}</div>
                </div>
                <span className="text-xl font-bold tabular-nums">+{score}</span>
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  const result = calculateLandingZoneScore(scores);

  return (
    <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
      <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Games
      </Link>

      <h1 className="text-3xl font-semibold tracking-tighter mb-6">Results</h1>

      <div className="text-center py-6 bg-card rounded-2xl border mb-6">
        <div className="text-6xl font-semibold text-accent tabular-nums">
          {result.total}<span className="text-3xl text-muted-foreground">/40</span>
        </div>
        <div className="text-lg mt-1">{result.percentage}% landing quality</div>
        <p className="text-sm text-muted-foreground mt-2 px-4">{effectiveLanding}</p>
      </div>

      <GameScoreCompare
        gameId="landing-zone-8"
        score={result.total}
        personalBest={personalBest}
        personalBestReady={personalBestReady}
        clubLabel={effectiveClub}
      />

      <div className="flex gap-3 mb-3">
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
  );
}
