"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, RotateCcw, Save, Loader2, Trophy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { calculate10BallScore } from "@/lib/practice/games";
import { savePracticeSession, getClubBag, getUserSessions, type ClubEntry } from "@/app/actions";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { markUserHasPracticed } from "@/lib/markHasPracticed";
import { IntentionPicker, SHAPES, TRAJECTORIES, type ShapeType, type TrajectoryType, shapeIcon, trajectoryIcon } from "@/components/practice/IntentionPicker";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";

// ─── Types & labels ───────────────────────────────────────────────────────────

type ShotScore = 5 | 4 | 3 | 1 | 0;

type ShotRecord = {
  shot: number;
  shape: ShapeType;
  trajectory: TrajectoryType;
  score: ShotScore;
};

const scoreLabels: Record<ShotScore, { label: string; yards: string; color: string }> = {
  5: { label: "Bullseye",   yards: "within 3 ft",   color: "bg-emerald-600 text-white border-emerald-600" },
  4: { label: "Inner Ring", yards: "within 6 ft",   color: "bg-emerald-500/80 text-white border-emerald-500" },
  3: { label: "Outer Ring", yards: "within 15 ft",  color: "bg-yellow-500 text-white border-yellow-500" },
  1: { label: "On Green",   yards: "outside 15 ft", color: "bg-orange-400 text-white border-orange-400" },
  0: { label: "Miss",       yards: "off the green", color: "bg-red-500 text-white border-red-500" },
};

const PRESET_TARGETS = [
  "Center flag", "Front flag", "Back flag",
  "Left flag", "Right flag", "Pin high left", "Pin high right", "Center green",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TenBallAccuracy() {
  // Bag & history
  const [bagLoading, setBagLoading]   = useState(true);
  const [clubBag, setClubBag]         = useState<ClubEntry[]>([]);
  const [bestByClub, setBestByClub]   = useState<Record<string, number>>({});
  const [bestByCombo, setBestByCombo] = useState<Record<string, number>>({});

  // Setup
  const [selectedClub, setSelectedClub]     = useState<ClubEntry | null>(null);
  const [customClub, setCustomClub]         = useState("");
  const [target, setTarget]                 = useState("Center flag");
  const [customTarget, setCustomTarget]     = useState("");
  const [useCustomTarget, setUseCustomTarget] = useState(false);
  const [sessionShape, setSessionShape]     = useState<ShapeType | null>(null);
  const [sessionTrajectory, setSessionTrajectory] = useState<TrajectoryType | null>(null);

  // Game
  const [hasStarted, setHasStarted] = useState(false);
  const sessionStartedAtRef = useSessionStartedAt(hasStarted);
  const [records, setRecords]       = useState<ShotRecord[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showLog, setShowLog]       = useState(false);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting]       = useState(false);

  const comboKey = (club: string, shape: string, traj: string) => `${club}|${shape}|${traj}`;

  useEffect(() => {
    getClubBag().then(bag => {
      setClubBag(bag);
      if (bag.length > 0) setSelectedClub(bag[0]);
      setBagLoading(false);
    });
    getUserSessions(500).then(sessions => {
      const bestClub: Record<string, number> = {};
      const bestCombo: Record<string, number> = {};
      sessions
        .filter(s => s.type === "game" && (s.config as any)?.gameId === "10-ball-accuracy" && s.score != null)
        .forEach(s => {
          const cfg = s.config as any;
          const club = cfg?.club as string | undefined;
          if (!club) return;
          if (bestClub[club] === undefined || s.score > bestClub[club]) bestClub[club] = s.score;
          const recs: any[] = cfg?.records ?? [];
          const shape = recs[0]?.shape as string | undefined;
          const traj  = recs[0]?.trajectory as string | undefined;
          if (shape && traj) {
            const k = comboKey(club, shape, traj);
            if (bestCombo[k] === undefined || s.score > bestCombo[k]) bestCombo[k] = s.score;
          }
        });
      setBestByClub(bestClub);
      setBestByCombo(bestCombo);
    });
  }, []);

  const effectiveClub     = selectedClub ? selectedClub.club : customClub || "Club";
  const effectiveTarget   = useCustomTarget ? (customTarget || "Custom target") : target;
  const effectiveDistance = selectedClub ? `${selectedClub.carry} yd` : "";
  const intentionSet      = sessionShape !== null && sessionTrajectory !== null;
  const scores            = records.map(r => r.score);
  const currentShot       = records.length + 1;

  function recordShot(score: ShotScore) {
    if (!sessionShape || !sessionTrajectory) return;
    const newRecords = [...records, { shot: currentShot, shape: sessionShape, trajectory: sessionTrajectory, score }];
    setRecords(newRecords);
    if (newRecords.length === 10) {
      setIsComplete(true);
      markUserHasPracticed();
      const result = calculate10BallScore(newRecords.map(r => r.score));
      toast.success(`Complete! ${result.total}/50 pts (${result.percentage}%)`);
    } else if (restInterval > 0) {
      setIsResting(true);
    }
  }

  function resetGame() {
    setHasStarted(false);
    setRecords([]);
    setIsComplete(false);
    setIsResting(false);
    setSessionShape(null);
    setSessionTrajectory(null);
    setShowLog(false);
  }

  async function saveSession() {
    const result = calculate10BallScore(scores);
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await savePracticeSession({
      type: "game",
      title: `10-Ball Accuracy — ${effectiveClub} → ${effectiveTarget}`,
      ...timing,
      config: { gameId: "10-ball-accuracy", club: effectiveClub, carry: selectedClub?.carry, target: effectiveTarget, records, result },
      score: result.total,
    });
    if (res.success) {
      toast.success("Saved!");
      setBestByClub(prev => {
        const cur = prev[effectiveClub] ?? -1;
        return result.total > cur ? { ...prev, [effectiveClub]: result.total } : prev;
      });
      if (sessionShape && sessionTrajectory) {
        const k = comboKey(effectiveClub, sessionShape, sessionTrajectory);
        setBestByCombo(prev => {
          const cur = prev[k] ?? -1;
          return result.total > cur ? { ...prev, [k]: result.total } : prev;
        });
      }
    } else {
      toast.error("Failed to save.");
    }
  }

  // ── SETUP ─────────────────────────────────────────────────────────────────────
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Target className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tighter">10-Ball Accuracy</h1>
        </div>
        <p className="text-muted-foreground mb-8">Pick a club, target and intention. Score 10 shots honestly.</p>

        <div className="space-y-6">
          {/* Club */}
          <div>
            <div className="text-sm font-semibold mb-2">Club</div>
            {bagLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading bag…
              </div>
            ) : clubBag.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 mb-2">
                  {clubBag.map(entry => {
                    const pb = bestByClub[entry.club];
                    const sel = selectedClub?.club === entry.club;
                    return (
                      <button
                        key={entry.club}
                        onClick={() => { setSelectedClub(entry); setCustomClub(""); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                          sel ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                        }`}
                      >
                        {entry.club}
                        {entry.carry > 0 && <span className={`text-xs font-normal ${sel ? "opacity-70" : "opacity-50"}`}>{entry.carry}yd</span>}
                        {pb !== undefined && (
                          <span className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            sel ? "bg-primary-foreground/20 text-primary-foreground"
                              : pb >= 40 ? "bg-emerald-100 text-emerald-700"
                              : pb >= 30 ? "bg-blue-100 text-blue-700"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            <Trophy className="h-2.5 w-2.5" />{pb}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={customClub}
                  onChange={e => { setCustomClub(e.target.value); setSelectedClub(null); }}
                  placeholder="Or type a custom club…"
                  className="w-full rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </>
            ) : (
              <>
                <input value={customClub} onChange={e => setCustomClub(e.target.value)}
                  className="w-full rounded-xl border bg-card px-4 py-3 text-lg" placeholder="7-Iron, Driver, 56°…" />
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Link href="/profile" className="text-primary hover:underline">Set up your bag</Link> for quick selection.
                </p>
              </>
            )}
          </div>

          {/* Target */}
          <div>
            <div className="text-sm font-semibold mb-2">Target</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_TARGETS.map(t => (
                <button key={t} onClick={() => { setTarget(t); setUseCustomTarget(false); }}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                    !useCustomTarget && target === t ? "bg-accent text-accent-foreground border-accent" : "bg-card hover:bg-muted"
                  }`}>{t}</button>
              ))}
              <button onClick={() => setUseCustomTarget(true)}
                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                  useCustomTarget ? "bg-accent text-accent-foreground border-accent" : "bg-card hover:bg-muted"
                }`}>Custom…</button>
            </div>
            {useCustomTarget && (
              <input value={customTarget} onChange={e => setCustomTarget(e.target.value)}
                placeholder="Describe your target…" autoFocus
                className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            )}
          </div>

          {/* Rest between shots */}
          <RestIntervalSelector value={restInterval} onChange={setRestInterval} />

          {/* Shot shape & trajectory */}
          <div>
            <div className="text-sm font-semibold mb-1">Shot Shape &amp; Trajectory</div>
            <p className="text-xs text-muted-foreground mb-3">Set once — applies to all 10 shots.</p>
            <IntentionPicker shape={sessionShape} trajectory={sessionTrajectory}
              onShape={setSessionShape} onTrajectory={setSessionTrajectory} />
          </div>

          {/* Session summary chip */}
          {(selectedClub || customClub) && intentionSet && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-3 text-sm flex flex-wrap gap-x-2 gap-y-1">
              <span className="font-semibold">{effectiveClub}</span>
              {effectiveDistance && <span className="text-muted-foreground">· {effectiveDistance}</span>}
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold">{effectiveTarget}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-semibold">{shapeIcon[sessionShape!]} {sessionShape} · {trajectoryIcon[sessionTrajectory!]} {sessionTrajectory}</span>
            </div>
          )}

          <Button
            size="lg" className="w-full h-14 text-base"
            disabled={!(selectedClub || customClub) || !intentionSet}
            onClick={() => setHasStarted(true)}
          >
            Start 10-Ball Challenge
          </Button>
        </div>
      </div>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────────
  if (!isComplete) {
    return (
      <>
      {isResting && <RestBetweenShots seconds={restInterval} onComplete={() => setIsResting(false)} />}
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>

        {/* Active header */}
        <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs opacity-60 tracking-widest mb-0.5">HITTING</div>
              <div className="font-semibold text-lg">{effectiveClub}</div>
              {effectiveDistance && <div className="text-sm opacity-75">{effectiveDistance}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs opacity-60 tracking-widest mb-0.5">TARGET</div>
              <div className="font-semibold text-lg">{effectiveTarget}</div>
            </div>
          </div>
          {sessionShape && sessionTrajectory && (
            <div className="border-t border-primary-foreground/20 pt-2 text-center text-sm font-semibold opacity-90">
              {shapeIcon[sessionShape]} {sessionShape} · {trajectoryIcon[sessionTrajectory]} {sessionTrajectory}
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2 font-medium">
            <div>Shot {Math.min(currentShot, 10)} of 10</div>
            <div>{records.length}/10</div>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-2 bg-accent transition-all" style={{ width: `${(records.length / 10) * 100}%` }} />
          </div>
          <div className="flex gap-1 mt-2">
            {Array.from({ length: 10 }).map((_, i) => {
              const r = records[i];
              return <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
                !r ? "bg-muted" : r.score === 5 ? "bg-emerald-600" : r.score === 4 ? "bg-emerald-400" :
                r.score === 3 ? "bg-yellow-400" : r.score === 1 ? "bg-orange-400" : "bg-red-500"
              }`} />;
            })}
          </div>
        </div>

        {/* Scoring buttons */}
        <div className="space-y-2.5">
          <div className="text-xs uppercase tracking-widest text-center mb-3 text-muted-foreground">How did it finish?</div>
          {([5, 4, 3, 1, 0] as const).map(score => (
            <button key={score} onClick={() => recordShot(score)}
              className="w-full h-16 text-left px-5 rounded-2xl border bg-card hover:bg-muted active:scale-[0.985] flex items-center justify-between transition">
              <div>
                <div className="text-base font-semibold leading-tight">{scoreLabels[score].label}</div>
                <div className="text-xs text-muted-foreground">{scoreLabels[score].yards}</div>
              </div>
              <span className={`text-xl font-bold tabular-nums px-3 py-1 rounded-xl ${scoreLabels[score].color}`}>+{score}</span>
            </button>
          ))}
        </div>
      </div>
      </>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────────
  const result    = calculate10BallScore(scores);
  const prevBest  = bestByClub[effectiveClub];
  const isNewBest = prevBest === undefined || result.total > prevBest;
  const comboPB   = sessionShape && sessionTrajectory
    ? bestByCombo[comboKey(effectiveClub, sessionShape, sessionTrajectory)]
    : undefined;

  return (
    <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
      <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Games
      </Link>

      <h1 className="text-3xl font-semibold tracking-tighter mb-6">Results</h1>

      {/* ── THIS SESSION ──────────────────────────────────────────── */}
      <div className="bg-card border rounded-2xl p-6 mb-4">
        <div className="text-xs font-semibold text-muted-foreground tracking-widest mb-4">THIS SESSION</div>

        {/* Big score */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-6xl font-semibold tabular-nums text-accent leading-none">
              {result.total}<span className="text-3xl text-muted-foreground">/50</span>
            </div>
            <div className="text-lg font-medium mt-1">{result.percentage}% accuracy</div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{effectiveClub}</div>
            <div>{effectiveTarget}</div>
            {sessionShape && sessionTrajectory && (
              <div className="mt-1 text-primary font-medium">
                {shapeIcon[sessionShape]} {sessionShape} · {trajectoryIcon[sessionTrajectory]} {sessionTrajectory}
              </div>
            )}
          </div>
        </div>

        {/* vs personal best */}
        {prevBest !== undefined && (
          <div className={`rounded-xl px-4 py-2.5 text-sm flex items-center justify-between ${
            isNewBest ? "bg-emerald-50 text-emerald-700" : "bg-muted/50 text-muted-foreground"
          }`}>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span>{isNewBest ? "New personal best!" : `Previous best: ${prevBest}/50`}</span>
            </div>
            {!isNewBest && (
              <span className="font-semibold">{result.total - prevBest > 0 ? "+" : ""}{result.total - prevBest} vs PB</span>
            )}
          </div>
        )}

        {/* Zone dots */}
        <div className="mt-4 space-y-1.5">
          {([5, 4, 3, 1, 0] as const).map(s => (
            result.breakdown[s] > 0 && (
              <div key={s} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground w-28">{scoreLabels[s].label}</span>
                <div className="flex gap-1 flex-1 mx-3">
                  {Array.from({ length: result.breakdown[s] }).map((_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-full ${scoreLabels[s].color.split(" ")[0]}`} />
                  ))}
                  {Array.from({ length: 10 - result.breakdown[s] }).map((_, i) => (
                    <div key={i} className="h-2 flex-1 rounded-full bg-muted" />
                  ))}
                </div>
                <span className="font-semibold w-4 text-right">{result.breakdown[s]}</span>
              </div>
            )
          ))}
        </div>

        {/* Shot log toggle */}
        <button onClick={() => setShowLog(v => !v)}
          className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition w-full justify-center">
          {showLog ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showLog ? "Hide" : "Show"} shot-by-shot log
        </button>
        {showLog && (
          <div className="mt-3 space-y-1 border-t pt-3">
            {records.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
                  <span className="font-medium">{r.shape} · {r.trajectory}</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreLabels[r.score].color}`}>
                  {scoreLabels[r.score].label} +{r.score}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── HISTORICAL SCORES ─────────────────────────────────────── */}
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="text-xs font-semibold text-muted-foreground tracking-widest mb-4">
          ALL-TIME BEST — {effectiveClub.toUpperCase()} (OUT OF 50)
        </div>

        {/* 3×3 combo grid */}
        <div className="rounded-xl border overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-4 bg-muted/40 border-b">
            <div className="p-2.5" />
            {SHAPES.map(shape => (
              <div key={shape} className="p-2.5 text-center border-l">
                <div className="text-base">{shapeIcon[shape]}</div>
                <div className="text-[10px] font-semibold text-muted-foreground">{shape}</div>
              </div>
            ))}
          </div>
          {TRAJECTORIES.map((traj, ti) => (
            <div key={traj} className={`grid grid-cols-4 ${ti < TRAJECTORIES.length - 1 ? "border-b" : ""}`}>
              <div className="p-2.5 flex flex-col items-center justify-center border-r bg-muted/20">
                <div className="text-base">{trajectoryIcon[traj]}</div>
                <div className="text-[10px] font-semibold text-muted-foreground">{traj}</div>
              </div>
              {SHAPES.map(shape => {
                const pb = bestByCombo[comboKey(effectiveClub, shape, traj)];
                const isThis = shape === sessionShape && traj === sessionTrajectory;
                return (
                  <div key={shape} className={`p-2.5 text-center border-l relative ${
                    isThis ? "ring-2 ring-inset ring-primary/40" : ""
                  } ${
                    pb === undefined ? "" :
                    pb >= 45 ? "bg-emerald-50" : pb >= 35 ? "bg-blue-50" : pb >= 25 ? "bg-amber-50" : ""
                  }`}>
                    {isThis && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />}
                    {pb !== undefined ? (
                      <>
                        <div className={`text-sm font-bold tabular-nums ${
                          pb >= 45 ? "text-emerald-700" : pb >= 35 ? "text-blue-700" :
                          pb >= 25 ? "text-amber-700" : "text-muted-foreground"
                        }`}>{pb}</div>
                        <div className="text-[9px] text-muted-foreground">{Math.round(pb / 50 * 100)}%</div>
                      </>
                    ) : (
                      <div className="text-muted-foreground/35 text-base">—</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Combos with no data hint */}
        {Object.keys(bestByCombo).filter(k => k.startsWith(effectiveClub + "|")).length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            No history for {effectiveClub} yet — this session will be your first!
          </p>
        )}
        {comboPB !== undefined && sessionShape && sessionTrajectory && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            <span className="font-medium text-foreground">Blue dot</span> = this session&apos;s combo ({sessionShape} · {sessionTrajectory})
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-3">
        <Button onClick={resetGame} variant="outline" size="lg" className="flex-1">
          <RotateCcw className="mr-2 h-4 w-4" /> Play Again
        </Button>
        <Button onClick={saveSession} size="lg" className="flex-1">
          <Save className="mr-2 h-4 w-4" /> Save Session
        </Button>
      </div>
      <Link href="/practice/games">
        <Button variant="ghost" className="w-full">Back to All Games</Button>
      </Link>
    </div>
  );
}
