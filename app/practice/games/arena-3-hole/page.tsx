"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, RotateCcw, Save, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { savePracticeSession, getClubBag } from "@/app/actions";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";
import {
  unlockPracticeAudio,
  celebrateBlockComplete,
  playArenaMissSound,
  notifyCadenceTick,
  speakPracticePrompt,
} from "@/lib/practice/feedback";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "setup" | "playing" | "error-pick" | "results";

type HoleShot = {
  label: string;
  club: string;
  distance: string;
  target: string;
};

type HoleConfig = {
  holeNumber: number;
  par: 3 | 4 | 5;
  scenario: string;
  shots: HoleShot[];
};

type FlatShot = HoleShot & {
  holeNumber: number;
  par: 3 | 4 | 5;
  scenario: string;
};

type ShotResult = {
  holeNumber: number;
  shotLabel: string;
  club: string;
  target: string;
  outcome: "hit" | "miss";
  errorType?: string;
  actualDirection?: "left" | "straight" | "right";
  shape?: ShapeType;
  trajectory?: TrajectoryType;
};

type BagEntry = { club: string; carry: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const ERROR_TYPES = [
  { id: "start-line",  label: "Wrong start line",  detail: "Ball started left or right of your intended line" },
  { id: "trajectory",  label: "Wrong trajectory",   detail: "Too high, too low, or wrong curvature" },
  { id: "distance",    label: "Wrong distance",      detail: "Short, long, or misjudged yardage" },
  { id: "contact",     label: "Poor contact",        detail: "Fat, thin, toe or heel strike" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickClub(
  bag: BagEntry[],
  preferredCarry: number,
  fallback: string
): { club: string; distance: string } {
  const withCarry = bag.filter(e => e.carry > 0);
  if (withCarry.length === 0) {
    return { club: fallback, distance: preferredCarry >= 999 ? "Full" : `${preferredCarry} yd` };
  }
  if (preferredCarry >= 999) {
    const longest = withCarry.reduce((a, b) => (b.carry > a.carry ? b : a));
    return { club: longest.club, distance: `${longest.carry} yd` };
  }
  const closest = withCarry.reduce((a, b) =>
    Math.abs(b.carry - preferredCarry) < Math.abs(a.carry - preferredCarry) ? b : a
  );
  return { club: closest.club, distance: `${closest.carry} yd` };
}

function generateHoles(bag: BagEntry[]): HoleConfig[] {
  const driver   = pickClub(bag, 999, "Driver");
  const approach = pickClub(bag, 155, "7-Iron");
  const par3Club = pickClub(bag, 170, "6-Iron");
  const layup    = pickClub(bag, 215, "3-Wood");
  const wedge    = pickClub(bag, 95,  "SW");

  const templates: Omit<HoleConfig, "holeNumber">[] = [
    {
      par: 4,
      scenario: "Dogleg right. Fairway bunker guards the corner. Shape it away from trouble.",
      shots: [
        { label: "Tee Shot", club: driver.club,   distance: driver.distance,   target: "Find the fairway" },
        { label: "Approach", club: approach.club,  distance: approach.distance, target: "On the green — any pin" },
      ],
    },
    {
      par: 3,
      scenario: "Water front and right. Middle of the green is the only play. Commit.",
      shots: [
        { label: "Tee Shot", club: par3Club.club, distance: par3Club.distance, target: "Any part of the green" },
      ],
    },
    {
      par: 5,
      scenario: "Uphill into the breeze. Lay up smart — then trust your scoring wedge.",
      shots: [
        { label: "Tee Shot", club: driver.club, distance: driver.distance, target: "Center fairway" },
        { label: "Lay-up",   club: layup.club,  distance: layup.distance,  target: "100 yards to flag" },
        { label: "Pitch",    club: wedge.club,  distance: wedge.distance,  target: "Inside 20 feet" },
      ],
    },
  ];

  // Shuffle hole order every round so the player can't mentally prepare
  return [...templates]
    .sort(() => Math.random() - 0.5)
    .map((t, i) => ({ ...t, holeNumber: i + 1 }));
}

function arenaRating(hits: number, total: number): { label: string; className: string } {
  const pct = hits / total;
  if (pct === 1)   return { label: "Perfect Round 🏆", className: "text-accent" };
  if (pct >= 0.84) return { label: "Elite — Tour caliber", className: "text-emerald-600 dark:text-emerald-400" };
  if (pct >= 0.67) return { label: "Strong — Solid round", className: "text-primary" };
  if (pct >= 0.5)  return { label: "Work to do — stay patient", className: "text-amber-600 dark:text-amber-400" };
  return { label: "Back to basics — errors are the curriculum", className: "text-rose-600 dark:text-rose-400" };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Arena3Hole() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [bag, setBag] = useState<BagEntry[]>([]);
  const [holes, setHoles] = useState<HoleConfig[]>([]);
  const [results, setResults] = useState<ShotResult[]>([]);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
  const [pendingTrajectory, setPendingTrajectory] = useState<TrajectoryType | null>(null);
  const [pendingMiss, setPendingMiss] = useState<ShotResult | null>(null);
  const [selectedErrorType, setSelectedErrorType] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const sessionStartedAtRef = useSessionStartedAt(phase !== "setup");

  useEffect(() => {
    getClubBag().then(b => {
      setBag(b);
      setHoles(generateHoles(b));
    });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const flatShots: FlatShot[] = holes.flatMap(h =>
    h.shots.map(s => ({ ...s, holeNumber: h.holeNumber, par: h.par, scenario: h.scenario }))
  );
  const totalShots = flatShots.length;
  const currentShot = flatShots[results.length];
  const intentionReady = pendingShape !== null && pendingTrajectory !== null;
  const progressPct = totalShots > 0 ? Math.round((results.length / totalShots) * 100) : 0;

  // Results metrics
  const hits = results.filter(r => r.outcome === "hit").length;
  const hitRate = totalShots > 0 ? Math.round((hits / totalShots) * 100) : 0;
  const rating = arenaRating(hits, totalShots);
  const errorCounts = results
    .filter(r => r.errorType)
    .reduce<Record<string, number>>((acc, r) => {
      acc[r.errorType!] = (acc[r.errorType!] ?? 0) + 1;
      return acc;
    }, {});
  const topErrorEntry = Object.entries(errorCounts).sort(([, a], [, b]) => b - a)[0];
  const topErrorLabel = topErrorEntry
    ? ERROR_TYPES.find(e => e.id === topErrorEntry[0])?.label
    : null;

  // ── Actions ───────────────────────────────────────────────────────────────

  function completeShot(newResults: ShotResult[]) {
    setResults(newResults);
    setPendingShape(null);
    setPendingTrajectory(null);
    if (newResults.length >= totalShots) {
      setPhase("results");
      speakPracticePrompt("Round complete. Check the error log.");
    } else {
      // Announce hole transitions
      const nextShot = flatShots[newResults.length];
      const prevShot = flatShots[newResults.length - 1];
      if (nextShot && prevShot && nextShot.holeNumber !== prevShot.holeNumber) {
        speakPracticePrompt(`Hole ${prevShot.holeNumber} done. Hole ${nextShot.holeNumber}, par ${nextShot.par}.`);
      }
      if (restInterval > 0) setIsResting(true);
    }
  }

  function logHit() {
    if (!currentShot || !intentionReady) return;
    celebrateBlockComplete();
    completeShot([...results, {
      holeNumber:  currentShot.holeNumber,
      shotLabel:   currentShot.label,
      club:        currentShot.club,
      target:      currentShot.target,
      outcome:     "hit",
      shape:       pendingShape    ?? undefined,
      trajectory:  pendingTrajectory ?? undefined,
    }]);
  }

  function initMiss() {
    if (!currentShot || !intentionReady) return;
    playArenaMissSound();
    setPendingMiss({
      holeNumber:  currentShot.holeNumber,
      shotLabel:   currentShot.label,
      club:        currentShot.club,
      target:      currentShot.target,
      outcome:     "miss",
      shape:       pendingShape    ?? undefined,
      trajectory:  pendingTrajectory ?? undefined,
    });
    setPendingShape(null);
    setPendingTrajectory(null);
    setPhase("error-pick");
  }

  function logError(errorType: string, actualDirection?: "left" | "straight" | "right") {
    if (!pendingMiss) return;
    notifyCadenceTick();
    const result: ShotResult = { ...pendingMiss, errorType, actualDirection };
    setPendingMiss(null);
    setSelectedErrorType(null);
    setPhase("playing");
    completeShot([...results, result]);
  }

  async function saveSession() {
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await savePracticeSession({
      type:  "game",
      title: "3-Hole Arena Test",
      ...timing,
      config: { gameId: "arena-3-hole", holes, results },
      score:  hits,
    });
    if (res.success) {
      setSaved(true);
      toast.success("Round saved to history");
    } else {
      toast.error("Save failed — try again");
    }
  }

  function playAgain() {
    setResults([]);
    setPendingShape(null);
    setPendingTrajectory(null);
    setPendingMiss(null);
    setHoles(generateHoles(bag));
    setSaved(false);
    setPhase("setup");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {isResting && (
        <RestBetweenShots seconds={restInterval} onComplete={() => setIsResting(false)} />
      )}

      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link
          href="/practice/games"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>

        {/* ── SETUP ──────────────────────────────────────────────────────── */}
        {phase === "setup" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-amber-500" />
              <h1 className="text-3xl font-semibold tracking-tighter">3-Hole Arena Test</h1>
            </div>
            <p className="text-muted-foreground">
              Three holes. Six shots. Real context — tee shot, approach, pitch. Hit the target or
              log exactly what went wrong. Honest errors drive the frustration signal your brain
              needs to adapt.
            </p>

            <div className="rounded-xl border border-amber-200/60 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/50 px-4 py-3 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-200 mb-1">Why this is different</p>
              <p className="text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                Range skills fail to transfer because practice has no context. Playing a real hole
                sequence — driver, then approach, then pitch — forces the decision-making your brain
                needs. Missing a target and labelling the error activates the neuroplasticity
                signal required for real course improvement.
              </p>
            </div>

            {/* Hole overview */}
            {holes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Today's Course
                </p>
                {holes.map(h => (
                  <div key={h.holeNumber} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
                    <div className="shrink-0 text-center min-w-[36px]">
                      <div className="text-[10px] text-muted-foreground">HOLE</div>
                      <div className="text-2xl font-semibold tabular-nums leading-none">{h.holeNumber}</div>
                      <span className={`inline-block mt-1 text-[10px] font-bold rounded px-1.5 py-0.5 ${
                        h.par === 3
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : h.par === 4
                          ? "bg-primary/10 text-primary"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                      }`}>
                        PAR {h.par}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground italic mb-2 leading-snug">{h.scenario}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {h.shots.map((s, i) => (
                          <span key={i} className="text-xs bg-muted rounded-full px-2.5 py-0.5">
                            {s.label}: <span className="font-medium">{s.club}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <RestIntervalSelector value={restInterval} onChange={setRestInterval} />

            <Button
              size="lg"
              className="w-full h-14 text-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold"
              onClick={() => { unlockPracticeAudio(); setPhase("playing"); }}
              disabled={holes.length === 0}
            >
              <Shield className="mr-2 h-5 w-5" /> Enter the Arena
            </Button>
            <p className="text-center text-xs text-muted-foreground -mt-2">
              6 shots · 3 holes · Honest binary scoring only
            </p>
          </div>
        )}

        {/* ── PLAYING ────────────────────────────────────────────────────── */}
        {phase === "playing" && currentShot && (
          <div>
            {/* Progress bar */}
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span className="font-medium">
                Hole {currentShot.holeNumber} · Par {currentShot.par} · {currentShot.label}
              </span>
              <span>{results.length}/{totalShots}</span>
            </div>
            <div className="h-2 bg-muted rounded-full mb-1.5 overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground italic mb-5 leading-snug">
              {currentShot.scenario}
            </p>

            {/* Shot card */}
            <div className="rounded-2xl border bg-card px-6 py-5 mb-5">
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-600 dark:text-amber-400 mb-1">
                {currentShot.label}
              </div>
              <div className="text-3xl font-semibold tracking-tighter mb-1">
                {currentShot.club} — {currentShot.distance}
              </div>
              <div className="text-base text-muted-foreground">
                Target: <span className="font-medium text-foreground">{currentShot.target}</span>
              </div>
            </div>

            {/* Intention */}
            <IntentionPicker
              shape={pendingShape}
              trajectory={pendingTrajectory}
              onShape={setPendingShape}
              onTrajectory={setPendingTrajectory}
            />

            {/* Hit / Miss */}
            <div className={`grid grid-cols-2 gap-3 mt-5 transition-opacity ${intentionReady ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <Button
                size="lg"
                className="h-16 text-lg gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={logHit}
                disabled={!intentionReady}
              >
                <CheckCircle2 className="h-5 w-5" /> Hit Target
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-16 text-lg gap-2 border-rose-400 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                onClick={initMiss}
                disabled={!intentionReady}
              >
                <XCircle className="h-5 w-5" /> Missed
              </Button>
            </div>
            {!intentionReady && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Set your shape &amp; trajectory to unlock ↑
              </p>
            )}
          </div>
        )}

        {/* ── ERROR PICK ──────────────────────────────────────────────────── */}
        {phase === "error-pick" && (
          <div>
            <div className="rounded-xl border border-rose-200/60 bg-rose-50/80 dark:bg-rose-950/20 dark:border-rose-900/50 px-4 py-3 mb-6">
              <div className="text-xs font-bold tracking-widest uppercase text-rose-700 dark:text-rose-400 mb-0.5">
                Miss recorded
              </div>
              <p className="text-sm text-rose-800/80 dark:text-rose-300/80 leading-snug">
                Honest signals are the curriculum. Your motor cortex needs to know exactly what
                went wrong to adapt. Pick one.
              </p>
            </div>

            <p className="font-semibold text-xl tracking-tight mb-4">What went wrong?</p>

            <div className="space-y-2">
              {ERROR_TYPES.map(e => (
                <div key={e.id}>
                  <button
                    onClick={() => {
                      if (e.id === "start-line") {
                        setSelectedErrorType(prev => prev === "start-line" ? null : "start-line");
                      } else {
                        logError(e.id);
                      }
                    }}
                    className={`w-full text-left rounded-xl border px-4 py-3.5 transition active:scale-[0.985] ${
                      selectedErrorType === e.id
                        ? "border-primary bg-primary/5"
                        : "bg-card hover:border-primary/50 hover:bg-muted/40"
                    }`}
                  >
                    <div className="font-semibold">{e.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{e.detail}</div>
                  </button>

                  {selectedErrorType === "start-line" && e.id === "start-line" && (
                    <div className="mt-2 px-1">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Which direction?</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(["left", "straight", "right"] as const).map(dir => (
                          <button
                            key={dir}
                            onClick={() => logError("start-line", dir)}
                            className="rounded-xl border bg-card py-2.5 text-sm font-medium hover:bg-primary/5 hover:border-primary transition active:scale-[0.985]"
                          >
                            {dir === "left" ? "← Left" : dir === "right" ? "Right →" : "Straight"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => { setPendingMiss(null); setSelectedErrorType(null); setPhase("playing"); }}
              className="mt-5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 block mx-auto"
            >
              ← I tapped Missed by mistake
            </button>
          </div>
        )}

        {/* ── RESULTS ─────────────────────────────────────────────────────── */}
        {phase === "results" && (
          <div className="space-y-5">
            {/* Score */}
            <div className="text-center py-8 rounded-2xl border bg-card">
              <div className="text-8xl font-semibold tabular-nums tracking-tighter text-amber-500 mb-1 leading-none">
                {hits}
                <span className="text-4xl text-muted-foreground font-normal">/{totalShots}</span>
              </div>
              <div className="text-2xl font-semibold mt-2 mb-1">{hitRate}% hit rate</div>
              <div className={`text-base font-semibold ${rating.className}`}>{rating.label}</div>
            </div>

            {/* Hit rate bar */}
            <div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${hitRate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0%</span><span>100%</span>
              </div>
            </div>

            {/* Top error coaching */}
            {topErrorLabel && (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/80 dark:bg-amber-950/25 px-4 py-3 text-sm">
                <span className="font-medium">Primary miss pattern: </span>
                <span className="text-amber-800 dark:text-amber-300 font-semibold">{topErrorLabel}</span>
                <span className="text-muted-foreground"> — target this specifically next session</span>
              </div>
            )}

            {/* Hole-by-hole */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              {holes.map(h => {
                const holeResults = results.filter(r => r.holeNumber === h.holeNumber);
                return (
                  <div key={h.holeNumber} className="px-4 py-3 border-b last:border-b-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold">Hole {h.holeNumber}</span>
                      <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">Par {h.par}</span>
                    </div>
                    <div className="space-y-1.5">
                      {holeResults.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          {r.outcome === "hit"
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            : <XCircle     className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                          }
                          <div className="min-w-0">
                            <span className="text-muted-foreground">{r.shotLabel} · </span>
                            <span className="font-medium">{r.club}</span>
                            {r.shape && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({r.shape} · {r.trajectory})
                              </span>
                            )}
                            {r.errorType && (
                              <div className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                                {ERROR_TYPES.find(e => e.id === r.errorType)?.label}
                                {r.actualDirection && r.actualDirection !== "straight" && (
                                  <span className="ml-1 text-rose-500/80">
                                    ({r.actualDirection === "left" ? "← left" : "right →"})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Neuroplasticity note */}
            <div className="rounded-xl border border-violet-200/50 bg-violet-50/70 dark:bg-violet-950/20 dark:border-violet-900/40 px-4 py-3 text-xs text-violet-800/80 dark:text-violet-300/80 leading-relaxed">
              Each honest miss created a neuroplasticity signal. Your motor cortex flagged the error
              and will attempt to correct it next session. The frustration you feel is the learning
              mechanism — not a sign you&apos;re failing.
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={playAgain} variant="outline" size="lg" className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" /> Play Again
              </Button>
              <Button onClick={saveSession} size="lg" className="flex-1" disabled={saved}>
                <Save className="mr-2 h-4 w-4" /> {saved ? "Saved ✓" : "Save Round"}
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
