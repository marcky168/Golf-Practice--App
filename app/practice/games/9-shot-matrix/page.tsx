"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Save, Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getUserSessions } from "@/app/actions";
import { saveGameSession } from "@/lib/practice/save-game-session";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";
import { GameScoreCompare } from "@/components/practice/GameScoreCompare";
import { useGamePersonalBest } from "@/components/practice/useGamePersonalBest";

// ─── Data ─────────────────────────────────────────────────────────────────────
const HEIGHTS  = ["High", "Mid", "Low"]  as const;
const SHAPES   = ["Draw", "Straight", "Fade"] as const;

type Height     = typeof HEIGHTS[number];
type Shape      = typeof SHAPES[number];
type ShotResult = "success" | "miss" | null;

const CLUB_OPTIONS = [
  { club: "GW",       note: "Gap Wedge — shaping at short range" },
  { club: "9-Iron",   note: "Easier to shape, great starting point" },
  { club: "8-Iron",   note: "Slightly longer, same principle" },
  { club: "7-Iron",   note: "Classic — the standard matrix club" },
  { club: "6-Iron",   note: "More challenging flight control" },
  { club: "5-Iron",   note: "Smaller margin for error" },
  { club: "4-Iron",   note: "Advanced — requires clean contact" },
  { club: "4-Hybrid", note: "Hybrid — easier to shape than long irons" },
  { club: "3-Hybrid", note: "Most challenging — elite ball flight control" },
];

// All 9 combinations in play order
const ALL_SHOTS: { height: Height; shape: Shape }[] = HEIGHTS.flatMap(h =>
  SHAPES.map(s => ({ height: h, shape: s }))
);

const HEIGHT_ICON: Record<Height, string> = { High: "⬆", Mid: "➡", Low: "⬇" };
const SHAPE_ICON:  Record<Shape,  string> = { Draw: "↙", Straight: "↓", Fade: "↘" };
const HEIGHT_COLOR: Record<Height, string> = {
  High: "text-blue-600 bg-blue-50",
  Mid:  "text-slate-600 bg-slate-100",
  Low:  "text-orange-600 bg-orange-50",
};
const SHAPE_COLOR: Record<Shape, string> = {
  Draw:     "text-purple-600 bg-purple-50",
  Straight: "text-emerald-600 bg-emerald-50",
  Fade:     "text-amber-600 bg-amber-50",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function NineShotMatrix() {
  const { personalBest, noteSavedScore, personalBestReady } = useGamePersonalBest("9-shot-matrix");
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const sessionStartedAtRef = useSessionStartedAt(!!selectedClub);
  const [results, setResults] = useState<Record<string, ShotResult>>({});
  const [focusedKey, setFocusedKey] = useState<string>("High-Draw");
  const [isComplete, setIsComplete] = useState(false);
  const [bestByClub, setBestByClub] = useState<Record<string, number>>({});
  const [scoresLoading, setScoresLoading] = useState(true);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    getUserSessions(500).then(sessions => {
      const best: Record<string, number> = {};
      sessions
        .filter((s): s is typeof s & { score: number } =>
          s.type === "game" && (s.config as any)?.gameId === "9-shot-matrix" && s.score != null
        )
        .forEach(s => {
          const club = (s.config as any)?.club as string | undefined;
          if (!club) return;
          if (best[club] === undefined || s.score > best[club]) best[club] = s.score;
        });
      setBestByClub(best);
      setScoresLoading(false);
    });
  }, []);

  const completed    = Object.keys(results).length;
  const successCount = Object.values(results).filter(r => r === "success").length;
  const focusedShot  = ALL_SHOTS.find(s => `${s.height}-${s.shape}` === focusedKey)
    ?? ALL_SHOTS[0];

  function recordShot(result: ShotResult) {
    const newResults = { ...results, [focusedKey]: result };
    setResults(newResults);

    const finalSuccess = Object.values(newResults).filter(r => r === "success").length;

    if (Object.keys(newResults).length === 9) {
      setIsComplete(true);
      toast.success(`${finalSuccess}/9 flight combinations nailed!`);
      return;
    }

    // Advance to next unrecorded shot
    const next = ALL_SHOTS.find(s => !newResults[`${s.height}-${s.shape}`]);
    if (next) setFocusedKey(`${next.height}-${next.shape}`);

    if (restInterval > 0) setIsResting(true);
  }

  function resetGame() {
    setResults({});
    setFocusedKey("High-Draw");
    setIsComplete(false);
    setSelectedClub(null);
  }

  async function saveSession() {
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await saveGameSession({
      type: "game",
      title: `9-Shot Matrix — ${selectedClub}`,
      ...timing,
      config: { gameId: "9-shot-matrix", club: selectedClub, results },
      score: successCount,
    }, noteSavedScore);
    if (res.success) {
      toast.success("Saved!");
      // Update local best so the club picker shows the new score immediately
      if (selectedClub) {
        setBestByClub(prev => {
          const current = prev[selectedClub] ?? -1;
          return successCount > current ? { ...prev, [selectedClub]: successCount } : prev;
        });
      }
    } else {
      toast.error("Save failed");
    }
  }

  // ─── CLUB PICKER ─────────────────────────────────────────────────────────────
  if (!selectedClub) {
    return (
      <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tighter">9-Shot Matrix</h1>
          <p className="text-muted-foreground text-sm mt-1">Hit all 9 trajectory × shape combos. Pick your club to start.</p>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium">Choose a club</div>
          {scoresLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="space-y-2 mb-8">
          {CLUB_OPTIONS.map(({ club, note }) => {
            const pb = bestByClub[club];
            return (
              <button
                key={club}
                onClick={() => setSelectedClub(club)}
                className="w-full flex items-center justify-between bg-card border rounded-2xl px-5 py-4 hover:border-primary hover:bg-primary/5 transition text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{club}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{note}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  {pb !== undefined ? (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      pb === 9 ? "bg-emerald-100 text-emerald-700" :
                      pb >= 7  ? "bg-blue-100 text-blue-700" :
                      pb >= 5  ? "bg-amber-100 text-amber-700" :
                                 "bg-muted text-muted-foreground"
                    }`}>
                      <Trophy className="h-3 w-3" />
                      {pb}/9
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground/50">No attempts</div>
                  )}
                  <div className="text-primary opacity-0 group-hover:opacity-100 transition text-sm font-medium">
                    →
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <RestIntervalSelector value={restInterval} onChange={setRestInterval} />
      </div>
    );
  }

  // ─── MATRIX ───────────────────────────────────────────────────────────────────
  return (
    <>
    {isResting && <RestBetweenShots seconds={restInterval} onComplete={() => setIsResting(false)} />}
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto px-4 pt-6">
      <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Games
      </Link>

      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tighter">9-Shot Matrix</h1>
          <p className="text-muted-foreground text-sm mt-1">Hit all 9 trajectory × shape combos. Be honest.</p>
        </div>
        <div className="shrink-0 bg-primary text-primary-foreground rounded-xl px-3 py-1.5 text-sm font-semibold mt-1">
          {selectedClub}
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-sm mb-2 mt-5">
        <span className="font-medium">{completed}/9 recorded</span>
        <span className="font-semibold text-emerald-600">{successCount} hits · {completed - successCount} misses</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completed / 9) * 100}%` }} />
      </div>

      {/* Matrix grid */}
      <div className="mb-6">
        {/* Shape header row */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          <div /> {/* empty corner */}
          {SHAPES.map(shape => (
            <div key={shape} className="text-center">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${SHAPE_COLOR[shape]}`}>
                {SHAPE_ICON[shape]} {shape}
              </div>
            </div>
          ))}
        </div>

        {/* Height rows */}
        {HEIGHTS.map(height => (
          <div key={height} className="grid grid-cols-4 gap-2 mb-2">
            {/* Row label */}
            <div className="flex items-center justify-end pr-1">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${HEIGHT_COLOR[height]}`}>
                {HEIGHT_ICON[height]} {height}
              </div>
            </div>

            {/* Cells */}
            {SHAPES.map(shape => {
              const key    = `${height}-${shape}`;
              const result = results[key];
              const isActive = key === focusedKey && !isComplete;

              return (
                <button
                  key={key}
                  onClick={() => !isComplete && setFocusedKey(key)}
                  disabled={isComplete}
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                    result === "success"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : result === "miss"
                      ? "bg-red-500 border-red-500 text-white"
                      : isActive
                      ? "bg-primary/10 border-primary shadow-sm"
                      : "bg-card border-border hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {result === "success" && <span className="text-2xl font-bold">✓</span>}
                  {result === "miss"    && <span className="text-2xl font-bold">✗</span>}
                  {!result && isActive  && <span className="text-lg">🎯</span>}
                  {!result && !isActive && <span className="w-2 h-2 rounded-full bg-muted-foreground/25" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Current shot action panel */}
      {!isComplete && (
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-5">
          <div className="text-xs font-semibold text-muted-foreground tracking-widest mb-3 text-center">
            {selectedClub} — NOW HITTING
          </div>

          <div className="flex items-center justify-center gap-4 mb-5">
            <div className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl ${HEIGHT_COLOR[focusedShot.height]}`}>
              <span className="text-2xl">{HEIGHT_ICON[focusedShot.height]}</span>
              <span className="text-sm font-semibold">{focusedShot.height}</span>
            </div>
            <div className="text-muted-foreground font-medium text-lg">×</div>
            <div className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl ${SHAPE_COLOR[focusedShot.shape]}`}>
              <span className="text-2xl">{SHAPE_ICON[focusedShot.shape]}</span>
              <span className="text-sm font-semibold">{focusedShot.shape}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              size="lg"
              className="h-16 text-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
              onClick={() => recordShot("success")}
            >
              HIT ✓
            </Button>
            <Button
              size="lg"
              variant="destructive"
              className="h-16 text-xl"
              onClick={() => recordShot("miss")}
            >
              MISS ✗
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-3">
            Tap any cell in the grid to jump to that combo.
          </p>
        </div>
      )}

      {/* Complete */}
      {isComplete && (
        <div className="space-y-4">
          <div className="text-center py-8 bg-card rounded-2xl border">
            <div className="text-6xl font-semibold tracking-tighter text-emerald-600 mb-1">
              {successCount}<span className="text-3xl text-muted-foreground">/9</span>
            </div>
            <div className="text-xl font-medium">flight combinations</div>
            <div className="text-sm text-muted-foreground mt-1">
              {successCount === 9 ? "Perfect round! Exceptional ball flight control." :
               successCount >= 7 ? "Great control. Keep working on the tough ones." :
               successCount >= 5 ? "Solid. Identify your weaker patterns and drill them." :
               "Good baseline — now you know exactly what to work on."}
            </div>
          </div>

          <GameScoreCompare gameId="9-shot-matrix" score={successCount} personalBest={personalBest} personalBestReady={personalBestReady} />

          {/* Breakdown by row */}
          <div className="bg-card rounded-2xl border p-5 space-y-3">
            <div className="font-medium text-sm">Breakdown by trajectory</div>
            {HEIGHTS.map(height => {
              const rowResults = SHAPES.map(s => results[`${height}-${s}`]);
              const hits = rowResults.filter(r => r === "success").length;
              return (
                <div key={height} className="flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold w-24 ${HEIGHT_COLOR[height]}`}>
                    {HEIGHT_ICON[height]} {height}
                  </div>
                  <div className="flex gap-1.5 flex-1">
                    {SHAPES.map(shape => {
                      const r = results[`${height}-${shape}`];
                      return (
                        <div key={shape} className={`flex-1 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          r === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                        }`}>
                          {r === "success" ? "✓" : "✗"}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-sm font-semibold w-8 text-right">{hits}/3</div>
                </div>
              );
            })}
          </div>

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
    </div>
    </>
  );
}
