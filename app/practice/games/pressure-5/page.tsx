"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RotateCcw, Save, Flame, Plus, Trash2, Shuffle, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { savePracticeSession, getClubBag, getUserSessions, type ClubEntry } from "@/app/actions";
import { buildSessionTiming } from "@/lib/practice/session-duration";
import { useSessionStartedAt } from "@/lib/practice/use-session-started-at";
import { SHAPES, TRAJECTORIES, type ShapeType, type TrajectoryType, shapeIcon, trajectoryIcon } from "@/components/practice/IntentionPicker";
import { RestBetweenShots, RestIntervalSelector } from "@/components/practice/RestBetweenShots";

// ─── Types ────────────────────────────────────────────────────────────────────
type Shot = { club: string; distance: string; rule: string; shape?: ShapeType; trajectory?: TrajectoryType };
type Phase = "setup" | "playing" | "complete";
type ShotLogEntry = { club: string; shape: ShapeType; trajectory: TrajectoryType; hit: boolean };

// ─── Levels ───────────────────────────────────────────────────────────────────
const LEVELS = [
  { target: 5,  label: "5 in a Row",  flames: 1, unlockReq: 0,  completedMsg: "You unlocked the 10-in-a-Row challenge!" },
  { target: 10, label: "10 in a Row", flames: 2, unlockReq: 5,  completedMsg: "You unlocked the ultimate 15-in-a-Row challenge!" },
  { target: 15, label: "15 in a Row", flames: 3, unlockReq: 10, completedMsg: "Maximum level achieved. You are elite." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function randomIntention() {
  return {
    shape:      SHAPES[Math.floor(Math.random() * SHAPES.length)] as ShapeType,
    trajectory: TRAJECTORIES[Math.floor(Math.random() * TRAJECTORIES.length)] as TrajectoryType,
  };
}

function suggestRule(club: string, carry: number): string {
  const name = club.toLowerCase();
  if (name.includes("driver")) return "In the fairway";
  if (name.includes("wood") || name.includes("hybrid")) return `Within ${Math.round(carry * 0.12)} yd of target`;
  return `Within ${Math.round(carry * 0.10)} yd of target`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PressureInARow() {
  const [phase, setPhase] = useState<Phase>("setup");
  const sessionStartedAtRef = useSessionStartedAt(phase === "playing" || phase === "complete");
  const [selectedLevel, setSelectedLevel] = useState(5);
  const [shots, setShots] = useState<Shot[]>([]);
  const [doShuffle, setDoShuffle] = useState(true);
  const [bagLoading, setBagLoading] = useState(true);
  const [clubBag, setClubBag] = useState<ClubEntry[]>([]);
  const [allTimeBest, setAllTimeBest] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [playShots, setPlayShots] = useState<Shot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [shotLog, setShotLog] = useState<ShotLogEntry[]>([]);
  const [restInterval, setRestInterval] = useState(0);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    getClubBag().then(bag => { setClubBag(bag); setBagLoading(false); });
    getUserSessions(500).then(sessions => {
      const best = sessions
        .filter(s => s.type === "game" && (s.config as any)?.gameId === "pressure-5")
        .reduce((max, s) => Math.max(max, s.score ?? 0), 0);
      setAllTimeBest(best);
      setHistoryLoading(false);
    });
  }, []);

  function isUnlocked(level: typeof LEVELS[number]) {
    return allTimeBest >= level.unlockReq;
  }

  const currentLevelDef = LEVELS.find(l => l.target === selectedLevel) ?? LEVELS[0];

  // ── Shot management ──────────────────────────────────────────────────────────
  function addFromBag(entry: ClubEntry) {
    if (shots.some(s => s.club === entry.club)) return;
    setShots(prev => [...prev, { club: entry.club, distance: `${entry.carry} yd`, rule: suggestRule(entry.club, entry.carry) }]);
  }

  function addBlankShot() {
    setShots(prev => [...prev, { club: "", distance: "", rule: "" }]);
  }

  function updateShot(i: number, field: keyof Shot, value: string) {
    setShots(prev => { const next = [...prev]; next[i] = { ...next[i], [field]: value }; return next; });
  }

  function removeShot(i: number) {
    setShots(prev => prev.filter((_, idx) => idx !== i));
  }

  // ── Game control ──────────────────────────────────────────────────────────────
  function startGame() {
    if (shots.length === 0) { toast.error("Add at least one shot before starting."); return; }
    if (shots.some(s => !s.club.trim())) { toast.error("Fill in all club names."); return; }
    const ordered = (doShuffle ? shuffleArray(shots) : [...shots]).map(s => ({ ...s, ...randomIntention() }));
    setPlayShots(ordered);
    setCurrentIndex(0); setCurrentStreak(0); setBestStreak(0); setTotalAttempts(0); setShotLog([]);
    setPhase("playing");
  }

  function recordShot(success: boolean) {
    if (!currentShot?.shape || !currentShot?.trajectory) return;
    setShotLog(log => [...log, { club: currentShot.club, shape: currentShot.shape!, trajectory: currentShot.trajectory!, hit: success }]);
    setTotalAttempts(t => t + 1);
    setCurrentIndex(i => (i + 1) % playShots.length);
    if (success) {
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      if (newStreak >= selectedLevel) {
        setPhase("complete");
        toast.success(`${selectedLevel} in a row! Incredible pressure performance.`);
      } else {
        toast.success(`${newStreak} in a row — keep it going!`);
        if (restInterval > 0) setIsResting(true);
      }
    } else {
      if (currentStreak > 0) toast.error(`Streak broken at ${currentStreak}. Restarting...`);
      setCurrentStreak(0);
      if (restInterval > 0) setIsResting(true);
    }
  }

  function resetGame() {
    const ordered = (doShuffle ? shuffleArray(shots) : [...shots]).map(s => ({ ...s, ...randomIntention() }));
    setPlayShots(ordered);
    setCurrentIndex(0); setCurrentStreak(0); setBestStreak(0); setTotalAttempts(0); setShotLog([]);
    setPhase("playing");
  }

  async function saveSession() {
    const timing = buildSessionTiming(sessionStartedAtRef.current ?? Date.now());
    const res = await savePracticeSession({
      type: "game",
      title: `Pressure ${selectedLevel}-in-a-Row — ${shots.map(s => s.club).join(", ")}`,
      ...timing,
      config: { gameId: "pressure-5", level: selectedLevel, shots, bestStreak, totalAttempts, shuffled: doShuffle, shotLog },
      score: bestStreak,
    });
    if (res.success) toast.success("Saved!");
    else toast.error("Save failed");
  }

  const currentShot = playShots[currentIndex] ?? playShots[0];

  // ── What level did the user just unlock? ─────────────────────────────────────
  const justUnlocked = LEVELS.find(l => l.unlockReq === selectedLevel && bestStreak >= selectedLevel);

  // ─── SETUP ───────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <Flame className="h-8 w-8 text-orange-500" />
          <h1 className="text-3xl font-semibold tracking-tighter">Pressure In A Row</h1>
        </div>
        <p className="text-muted-foreground mb-8">Hit consecutive perfect shots without missing. Miss = streak resets.</p>

        {/* Level selector */}
        <div className="mb-6">
          <div className="text-sm font-medium mb-3">Challenge Level</div>
          {historyLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your history…</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {LEVELS.map(level => {
                const unlocked = isUnlocked(level);
                const isSelected = selectedLevel === level.target;
                const bestForLevel = allTimeBest >= level.target;
                return (
                  <button
                    key={level.target}
                    onClick={() => unlocked && setSelectedLevel(level.target)}
                    disabled={!unlocked}
                    className={`relative rounded-2xl border-2 p-4 text-center transition flex flex-col items-center gap-2 ${
                      isSelected
                        ? "border-orange-500 bg-orange-500/10"
                        : unlocked
                        ? "border-border bg-card hover:border-orange-300 hover:bg-orange-50"
                        : "border-border/40 bg-muted/30 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {/* Flame icons */}
                    <div className="text-xl">{Array.from({ length: level.flames }).map((_, i) => (
                      <span key={i}>🔥</span>
                    ))}</div>
                    <div className="font-semibold text-sm leading-tight">{level.label}</div>
                    {bestForLevel && (
                      <div className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 rounded-full px-2 py-0.5">
                        COMPLETED ✓
                      </div>
                    )}
                    {!unlocked && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        Beat {level.unlockReq} first
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rest between shots */}
        <RestIntervalSelector value={restInterval} onChange={setRestInterval} />

        {/* Shuffle toggle */}
        <div className="flex items-center justify-between bg-card border rounded-2xl px-5 py-4 mb-6">
          <div>
            <div className="font-medium text-sm">Shuffle shot order</div>
            <div className="text-xs text-muted-foreground mt-0.5">Randomize the rotation each game for more pressure</div>
          </div>
          <button
            onClick={() => setDoShuffle(d => !d)}
            className={`w-12 h-6 rounded-full transition-colors relative ${doShuffle ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${doShuffle ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Quick-pick from bag */}
        {bagLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your club bag...
          </div>
        ) : clubBag.length > 0 ? (
          <div className="mb-6">
            <div className="text-sm font-medium mb-1">Quick-pick from your bag</div>
            <p className="text-xs text-muted-foreground mb-3">Tap a club to add it. Distance and target auto-fill.</p>
            <div className="flex flex-wrap gap-2">
              {clubBag.map(entry => {
                const alreadyAdded = shots.some(s => s.club === entry.club);
                return (
                  <button
                    key={entry.club}
                    onClick={() => addFromBag(entry)}
                    disabled={alreadyAdded}
                    className={`px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                      alreadyAdded ? "bg-primary/10 border-primary/30 text-primary opacity-50 cursor-default" : "bg-card hover:bg-primary/10 hover:border-primary/40"
                    }`}
                  >
                    {entry.club} <span className="opacity-60 font-normal">{entry.carry}yd</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-6 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            No club bag set up.{" "}
            <Link href="/profile" className="text-primary hover:underline">Add your distances in My Bag</Link>
            {" "}to enable quick-pick.
          </div>
        )}

        {/* Shot list */}
        {shots.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-3">Your shots ({shots.length})</div>
            <div className="space-y-3">
              {shots.map((shot, i) => (
                <div key={i} className="bg-card border rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">SHOT {i + 1}</span>
                    <button onClick={() => removeShot(i)} className="text-muted-foreground hover:text-destructive transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Club</label>
                      <input value={shot.club} onChange={e => updateShot(i, "club", e.target.value)} placeholder="e.g. 7-Iron"
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Distance</label>
                      <input value={shot.distance} onChange={e => updateShot(i, "distance", e.target.value)} placeholder="e.g. 150 yd"
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Target / Rule</label>
                    <input value={shot.rule} onChange={e => updateShot(i, "rule", e.target.value)} placeholder="e.g. Within 15 yd of flag"
                      className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={addBlankShot} className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-8">
          <Plus className="h-4 w-4" /> Add shot manually
        </button>

        <Button size="lg" className="w-full h-14 text-lg" onClick={startGame} disabled={shots.length === 0}>
          <Flame className="mr-2 h-5 w-5" /> Start {selectedLevel}-in-a-Row {doShuffle && <Shuffle className="ml-2 h-4 w-4 opacity-70" />}
        </Button>
      </div>
    );
  }

  // ─── PLAYING ─────────────────────────────────────────────────────────────────
  if (phase === "playing" && currentShot) {
    return (
      <>
      {isResting && <RestBetweenShots seconds={restInterval} onComplete={() => setIsResting(false)} />}
      <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
        <Link href="/practice/games" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Games
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Flame className="h-8 w-8 text-orange-500" />
            <h1 className="text-2xl font-semibold tracking-tighter">{selectedLevel}-in-a-Row</h1>
          </div>
          <div className="text-sm font-medium text-orange-500 bg-orange-500/10 rounded-full px-3 py-1">
            {"🔥".repeat(currentLevelDef.flames)}
          </div>
        </div>

        {/* Current shot card */}
        <div className="bg-primary text-primary-foreground rounded-2xl p-6 mb-6">
          <div className="text-xs font-semibold tracking-widest opacity-60 mb-3">CURRENT SHOT</div>
          <div className="text-4xl font-semibold">{currentShot.club}</div>
          {currentShot.distance && <div className="text-2xl opacity-80 mt-1">{currentShot.distance}</div>}
          {currentShot.rule && (
            <div className="mt-3 inline-block bg-primary-foreground/15 rounded-xl px-3 py-1.5 text-sm font-medium">
              {currentShot.rule}
            </div>
          )}
          <div className="text-xs opacity-40 mt-4">
            Shot {(currentIndex % playShots.length) + 1} of {playShots.length} in rotation{doShuffle && " · shuffled"}
          </div>
        </div>

        {/* Progress dots — scales to selected level */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {Array.from({ length: selectedLevel }).map((_, i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${
              i < currentStreak ? "bg-orange-500 border-orange-500 scale-110" : "bg-transparent border-muted-foreground/30"
            }`} />
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card border rounded-2xl p-4 text-center">
            <div className="text-4xl font-semibold tabular-nums text-orange-500">{currentStreak}</div>
            <div className="text-xs text-muted-foreground mt-1">Streak</div>
          </div>
          <div className="bg-card border rounded-2xl p-4 text-center">
            <div className="text-4xl font-semibold tabular-nums">{bestStreak}</div>
            <div className="text-xs text-muted-foreground mt-1">Best</div>
          </div>
          <div className="bg-card border rounded-2xl p-4 text-center">
            <div className="text-4xl font-semibold tabular-nums">{totalAttempts}</div>
            <div className="text-xs text-muted-foreground mt-1">Shots</div>
          </div>
        </div>

        {/* Intention */}
        {currentShot.shape && currentShot.trajectory && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 text-center mb-5">
            <div className="text-xs text-muted-foreground tracking-widest mb-1">INTENTION</div>
            <div className="text-xl font-semibold text-primary">
              {shapeIcon[currentShot.shape]} {currentShot.shape}
              <span className="text-muted-foreground mx-2">·</span>
              {trajectoryIcon[currentShot.trajectory]} {currentShot.trajectory}
            </div>
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground mb-4">Did you meet the target rule?</div>
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" className="h-20 text-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800" onClick={() => recordShot(true)}>
            HIT ✓
          </Button>
          <Button size="lg" variant="destructive" className="h-20 text-xl" onClick={() => recordShot(false)}>
            MISS ✗
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">Be brutally honest. This only works if you are.</p>

        {/* Rotation */}
        <div className="mt-8 rounded-xl border bg-muted/30 p-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider">ROTATION</div>
          <div className="space-y-1">
            {playShots.map((s, i) => {
              const isNow = i === currentIndex % playShots.length;
              return (
                <div key={i} className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 ${isNow ? "bg-primary/10 font-medium" : "text-muted-foreground"}`}>
                  <span className="w-4 text-xs shrink-0">{i + 1}.</span>
                  <span className="font-medium">{s.club}</span>
                  {s.distance && <><span className="opacity-40">·</span><span>{s.distance}</span></>}
                  {s.rule && <span className="opacity-50 text-xs truncate hidden sm:block">— {s.rule}</span>}
                  {isNow && <span className="ml-auto text-xs text-primary font-semibold shrink-0">← NOW</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </>
    );
  }

  // ─── COMPLETE ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-6">
      <div className="flex items-center gap-3 mb-8">
        <Flame className="h-8 w-8 text-orange-500" />
        <h1 className="text-3xl font-semibold tracking-tighter">{selectedLevel}-in-a-Row</h1>
      </div>

      {/* Completion banner */}
      <div className="text-center py-8 bg-gradient-to-b from-orange-500/10 to-transparent rounded-3xl border border-orange-500/20 mb-6">
        <div className="text-7xl mb-2">{"🔥".repeat(currentLevelDef.flames)}</div>
        <div className="text-3xl font-semibold tracking-tight">{selectedLevel} in a Row!</div>
        <div className="text-muted-foreground mt-1">You handled real pressure.</div>
      </div>

      {/* Unlock message */}
      {justUnlocked && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
          <div className="text-2xl">🔓</div>
          <div>
            <div className="font-semibold text-emerald-800 text-sm">New Challenge Unlocked!</div>
            <div className="text-emerald-700 text-xs mt-0.5">{currentLevelDef.completedMsg}</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-card rounded-2xl p-5 border space-y-3 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Best streak this game</span>
          <span className="font-semibold">{bestStreak}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total shots taken</span>
          <span className="font-semibold">{totalAttempts}</span>
        </div>
        {/* Level progress */}
        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-2">Your levels</div>
          <div className="space-y-1.5">
            {LEVELS.map(level => {
              const done = allTimeBest >= level.target || bestStreak >= level.target;
              const unlocked = allTimeBest >= level.unlockReq || bestStreak >= level.unlockReq;
              return (
                <div key={level.target} className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${!unlocked ? "text-muted-foreground/50" : ""}`}>
                    {!unlocked && <Lock className="h-3 w-3" />}
                    {"🔥".repeat(level.flames)} {level.label}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    done ? "bg-emerald-100 text-emerald-700" : unlocked ? "bg-muted text-muted-foreground" : "opacity-40 bg-muted text-muted-foreground"
                  }`}>
                    {done ? "Completed ✓" : unlocked ? "In progress" : "Locked"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shot log */}
        {shotLog.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground mb-2">Shot log</div>
            <div className="space-y-1.5">
              {shotLog.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                    <span className="font-medium truncate">{s.club}</span>
                    <span className="text-muted-foreground text-xs shrink-0">{s.shape} · {s.trajectory}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ml-2 ${s.hit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                    {s.hit ? "HIT" : "MISS"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-3">
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
  );
}
