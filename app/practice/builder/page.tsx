"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Wrench, Play, CheckCircle2, Shuffle, Target, BookOpen } from "lucide-react";
import { toast } from "sonner";

import {
  BUILDER_FOCUS_OPTIONS,
  BALLS_PER_BLOCK_OPTIONS,
  BLOCK_COUNT_OPTIONS,
  CADENCE_OPTIONS,
  createBuilderSessionConfig,
  getClubsForBuilderFocus,
} from "@/lib/practice/builder";
import { getFocusCuesForBuilderFocus } from "@/lib/practice/constants";
import { CHIPPING_MAX_YARDS } from "@/lib/practice/chipping";
import {
  getSwingLengthOptionsForFocus,
  defaultSwingLengthForFocus,
  resolveSwingLengthForFocus,
  focusSupportsSwingLength,
} from "@/lib/practice/partial-shots";
import type { BuilderFocus, BuilderPracticeMode, SessionConfig, SwingLength } from "@/lib/practice/types";
import { SessionRunner } from "@/components/practice/SessionRunner";
import { SessionRunnerErrorBoundary } from "@/components/practice/SessionRunnerErrorBoundary";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { ResumePrompt, clearPartialSession, type PartialSession } from "@/components/practice/ResumePrompt";
import { savePracticeSession, getClubBag } from "@/app/actions";
import { enrichConfigForSave, timingFromCompletion } from "@/lib/practice/session-save";
import { unlockPracticeAudio } from "@/lib/practice/feedback";
import { DELIBERATE_CHECKLIST } from "@/lib/practice/constants";
import { BlockDrillLibraryList } from "@/components/practice/BlockDrillLibraryList";
import {
  BLOCK_DRILL_LIBRARY,
  loadBlockDrillPreset,
  presetNeedsIntention,
} from "@/lib/practice/block-drills";

type FlowStep = "wizard" | "running" | "complete";
type EntryMode = "custom" | "library";

const PRACTICE_MODES: { value: BuilderPracticeMode; label: string; hint: string }[] = [
  { value: "block", label: "Block", hint: "Same shot repeated — best for grooving feel" },
  { value: "random", label: "Random", hint: "Shuffled shots each block — better transfer" },
  { value: "transition", label: "Block → Random", hint: "First blocks repeat, later blocks shuffle" },
];

export default function PracticeBuilderPage() {
  const [step, setStep] = useState<FlowStep>("wizard");
  const [entryMode, setEntryMode] = useState<EntryMode>("custom");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const selectedPreset = BLOCK_DRILL_LIBRARY.find(d => d.id === selectedPresetId) ?? null;

  const [focus, setFocus] = useState<BuilderFocus>("full-swing");
  const [selectedClubs, setSelectedClubs] = useState<string[]>([]);
  const [swingLength, setSwingLength] = useState<SwingLength>("full");
  const [ballsPerBlock, setBallsPerBlock] = useState(10);
  const [numBlocks, setNumBlocks] = useState(3);
  const [cadenceSeconds, setCadenceSeconds] = useState(30);
  const [practiceMode, setPracticeMode] = useState<BuilderPracticeMode>("block");
  const [focusCue, setFocusCue] = useState("");
  const [customCue, setCustomCue] = useState("");
  const [target, setTarget] = useState("Center flag");
  const [clubs, setClubs] = useState<string[]>([]);
  const [userBag, setUserBag] = useState<{ club: string; carry: number }[]>([]);
  const [bagLoading, setBagLoading] = useState(true);
  const [sessionShape, setSessionShape] = useState<ShapeType | null>(null);
  const [sessionTrajectory, setSessionTrajectory] = useState<TrajectoryType | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false]);

  const [microPauseMode, setMicroPauseMode] = useState(false);
  const [slowBurn, setSlowBurn] = useState(false);

  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [resumeData, setResumeData] = useState<PartialSession | null>(null);

  const skipIntentionCustom = focus === "putting" || focus === "bunker";
  const skipIntentionLibrary = selectedPreset
    ? !presetNeedsIntention(selectedPreset.focus) || selectedPreset.practiceMode === "random"
    : true;
  const skipIntention =
    entryMode === "custom"
      ? skipIntentionCustom || practiceMode === "random"
      : skipIntentionLibrary;
  const showSwingLength = focusSupportsSwingLength(focus);
  const isChecklistComplete = checklist.every(Boolean);
  const isIntentionSet = skipIntention || (sessionShape !== null && sessionTrajectory !== null);
  const effectiveCue = customCue.trim() || focusCue || getFocusCuesForBuilderFocus(focus)[0];
  const totalBalls = ballsPerBlock * numBlocks;

  const canStartCustom =
    isChecklistComplete &&
    isIntentionSet &&
    userBag.length > 0 &&
    clubs.length > 0 &&
    selectedClubs.length > 0;

  const canStartLibrary =
    isChecklistComplete &&
    isIntentionSet &&
    userBag.length > 0 &&
    !!selectedPresetId &&
    loadBlockDrillPreset(selectedPresetId, userBag) !== null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "library") setEntryMode("library");
    const drillId = params.get("drill");
    if (drillId) setSelectedPresetId(drillId);

    if (params.get("repeat") === "1") {
      try {
        const raw = localStorage.getItem("golf_os_last_builder_config_v1");
        if (raw) {
          const parsed = JSON.parse(raw) as { config?: SessionConfig };
          if (parsed?.config) {
            // Strip stale per-rep data; regenerate random intentions in the runner via the new config
            const fresh: SessionConfig = {
              ...parsed.config,
              repRecords: undefined,
              blockResults: undefined,
            };
            unlockPracticeAudio();
            setSessionConfig(fresh);
            setStep("running");
            toast.success("Repeating last session — fresh reps, same plan");
            // Clear the query param so refresh doesn't repeat-loop
            const url = new URL(window.location.href);
            url.searchParams.delete("repeat");
            window.history.replaceState({}, "", url.toString());
          }
        }
      } catch {
        // ignore — fall back to normal wizard
      }
    }
  }, []);

  useEffect(() => {
    getClubBag().then(bag => {
      setUserBag(bag);
      setBagLoading(false);
      const list = getClubsForBuilderFocus(focus, bag);
      setClubs(list);
      setSelectedClubs(prev => {
        const kept = prev.filter(c => list.includes(c));
        if (kept.length > 0) return kept;
        return list.length > 0 ? [list[0]] : [];
      });
    });
  }, [focus]);

  useEffect(() => {
    const cues = getFocusCuesForBuilderFocus(focus);
    if (cues.length > 0) setFocusCue(cues[0]);
    setSwingLength(prev => {
      const allowed = getSwingLengthOptionsForFocus(focus).map(o => o.value);
      return allowed.includes(prev) ? prev : defaultSwingLengthForFocus(focus);
    });
  }, [focus]);

  function toggleClub(name: string) {
    setSelectedClubs(prev => {
      if (prev.includes(name)) {
        const next = prev.filter(c => c !== name);
        return next.length > 0 ? next : prev;
      }
      return [...prev, name];
    });
  }

  function toggleChecklist(index: number) {
    const next = [...checklist];
    next[index] = !next[index];
    setChecklist(next);
  }

  function startSession() {
    unlockPracticeAudio();
    if (!isChecklistComplete || !isIntentionSet) return;
    if (userBag.length === 0) {
      toast.error("Add clubs on your Profile first.");
      return;
    }
    if (selectedClubs.length === 0) {
      toast.error("Select at least one club from your profile bag.");
      return;
    }

    const rawConfig = createBuilderSessionConfig({
      focus,
      clubs: selectedClubs,
      swingLength: showSwingLength
        ? resolveSwingLengthForFocus(focus, swingLength)
        : defaultSwingLengthForFocus(focus),
      ballsPerBlock,
      numBlocks,
      cadenceSeconds,
      practiceMode,
      focusCue: effectiveCue,
      target: target.trim() || undefined,
      userBag,
    });
    if (!rawConfig) {
      toast.error("Could not build session with your bag clubs.");
      return;
    }
    const config: SessionConfig = {
      ...rawConfig,
      ...(microPauseMode ? { microPauseMode: true } : {}),
      ...(slowBurn ? { slowBurn: true } : {}),
    };
    setSessionConfig(config);
    setStep("running");
    saveRepeatableSession(config);
    toast.success(`${totalBalls} balls · ${numBlocks} blocks · ${cadenceSeconds}s cadence`);
  }

  function saveRepeatableSession(config: SessionConfig) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        "golf_os_last_builder_config_v1",
        JSON.stringify({
          title: config.title,
          savedAt: new Date().toISOString(),
          config,
        })
      );
    } catch {
      // localStorage may be unavailable in private mode — non-fatal
    }
  }

  function startLibrarySession() {
    unlockPracticeAudio();
    if (!canStartLibrary || !selectedPresetId) return;

    const config = loadBlockDrillPreset(selectedPresetId, userBag);
    if (!config) {
      toast.error("Add the required clubs on your Profile to run this drill.");
      return;
    }

    setSessionConfig(config);
    setStep("running");
    saveRepeatableSession(config);
    const total =
      (config.ballsPerBlock ?? 0) * (config.numBlocks ?? 0) || config.drills.length;
    toast.success(`Started — ${total} shots`);
  }

  async function handleSessionComplete(result: {
    repRecords: unknown[];
    blockResults: unknown[];
    durationMinutes: number;
    reflection: unknown;
    notes: string;
  }) {
    if (!sessionConfig) return;
    const res = await savePracticeSession({
      type: "block",
      title: sessionConfig.title,
      ...timingFromCompletion(result),
      config: enrichConfigForSave(sessionConfig, {
        repRecords: result.repRecords as Parameters<typeof enrichConfigForSave>[1]["repRecords"],
        blockResults: result.blockResults as Parameters<typeof enrichConfigForSave>[1]["blockResults"],
      }),
      reflection: result.reflection as Parameters<typeof savePracticeSession>[0]["reflection"],
      notes: result.notes,
    });
    if (res.success) {
      setStep("complete");
      toast.success("Session saved — check History for trends");
    } else {
      toast.error("Failed to save session.");
    }
  }

  function handleResume(saved: PartialSession) {
    unlockPracticeAudio();
    setSessionConfig(saved.config);
    setResumeData(saved);
    if (saved.fixedIntention) {
      setSessionShape(saved.fixedIntention.shape as ShapeType);
      setSessionTrajectory(saved.fixedIntention.trajectory as TrajectoryType);
    }
    setStep("running");
  }

  function resetFlow() {
    setStep("wizard");
    setEntryMode("custom");
    setSelectedPresetId(null);
    setChecklist([false, false, false]);
    setSessionConfig(null);
    setResumeData(null);
  }

  if (step === "wizard") {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
        <Link href="/practice" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Practice
        </Link>

        <ResumePrompt onResume={handleResume} onDiscard={() => clearPartialSession()} />

        <div className="flex items-center gap-3 mb-2">
          <Wrench className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tighter">Practice Builder</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          Build your own session or pick a pre-built drill from the library.
        </p>

        <div className="grid grid-cols-2 gap-2 mb-8">
          <button
            type="button"
            onClick={() => setEntryMode("custom")}
            className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition active:scale-[0.985] ${
              entryMode === "custom" ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"
            }`}
          >
            <Wrench className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Custom session</span>
            <span className="text-xs text-muted-foreground">Focus, clubs, blocks &amp; cadence</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEntryMode("library");
              setSelectedPresetId(null);
            }}
            className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition active:scale-[0.985] ${
              entryMode === "library" ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"
            }`}
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Drill library</span>
            <span className="text-xs text-muted-foreground">Pre-built block sessions</span>
          </button>
        </div>

        <div className="space-y-8">
          {entryMode === "library" && (
            <>
              {userBag.length === 0 && (
                <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 px-4 py-3">
                  Add clubs on your{" "}
                  <Link href="/profile" className="underline text-primary">Profile</Link>{" "}
                  to load drills with your bag.
                </p>
              )}
              <BlockDrillLibraryList
                userBag={userBag}
                bagLoading={bagLoading}
                selectedId={selectedPresetId}
                onSelect={setSelectedPresetId}
              />
            </>
          )}

          {entryMode === "custom" && (
          <>
          <div>
            <Label className="mb-3 block text-base">Skill focus</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BUILDER_FOCUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFocus(opt.value)}
                  className={`h-14 rounded-xl border text-sm font-medium transition active:scale-[0.985] ${
                    focus === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-1 block text-base">Clubs (from your bag)</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Tap to select one or more. Block mode rotates clubs per block; random mode mixes every rep.
            </p>
            {userBag.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add clubs on your{" "}
                <Link href="/profile" className="underline text-primary">Profile</Link>{" "}
                first.
              </p>
            ) : clubs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bag clubs match this focus — try another focus or update your{" "}
                <Link href="/profile" className="underline text-primary">Profile</Link>.
              </p>
            ) : (
            <div className="flex flex-wrap gap-2">
              {clubs.map(c => {
                const carry = userBag.find(e => e.club === c)?.carry;
                const selected = selectedClubs.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleClub(c)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition active:scale-[0.985] ${
                      selected ? "bg-primary text-primary-foreground border-primary" : "bg-card"
                    }`}
                  >
                    {c}
                    {carry != null && carry > 0 && (
                      <span className={`ml-1 text-xs ${selected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {carry}y
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            )}
            {selectedClubs.length > 1 && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected: {selectedClubs.join(", ")}
              </p>
            )}
          </div>

          {focus === "chipping" && (
            <p className="text-sm text-muted-foreground -mt-4 mb-2 rounded-xl border bg-muted/40 px-4 py-3">
              Every chip is <strong>{CHIPPING_MAX_YARDS} yards or less</strong>. Wedges, 9-iron, and hybrids from your bag are available — distances are chip-length, not full carry.
            </p>
          )}

          {focus === "pitching" && (
            <p className="text-sm text-muted-foreground -mt-4 mb-2 rounded-xl border bg-muted/40 px-4 py-3">
              Pitching is <strong>partial-swing only</strong> (3/4, 1/2, or mix) — distances stay below your stock carry.
            </p>
          )}

          {showSwingLength && (
            <div>
              <Label className="mb-1 block text-base">Swing length</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {focus === "pitching"
                  ? "Partial swings only (3/4, 1/2, or mix) — no full stock shots."
                  : "Uses carry from your profile for full, 3/4, or half swings."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {getSwingLengthOptionsForFocus(focus).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSwingLength(opt.value)}
                    className={`text-left px-4 py-3 rounded-xl border transition ${
                      swingLength === opt.value ? "border-primary bg-primary/5" : "bg-card"
                    }`}
                  >
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{opt.hint}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="mb-2 block">Balls per block</Label>
            <div className="flex flex-wrap gap-2">
              {BALLS_PER_BLOCK_OPTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBallsPerBlock(n)}
                  className={`px-5 py-2 rounded-lg border font-medium ${ballsPerBlock === n ? "bg-primary text-primary-foreground" : "bg-card"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Number of blocks</Label>
            <div className="flex flex-wrap gap-2">
              {BLOCK_COUNT_OPTIONS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNumBlocks(n)}
                  className={`px-5 py-2 rounded-lg border font-medium ${numBlocks === n ? "bg-primary text-primary-foreground" : "bg-card"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">{totalBalls} total balls</p>
          </div>

          <div>
            <Label className="mb-1 block">Shot timer (cadence)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Countdown between shots enforces your pre-shot routine — the main benefit of block practice.
            </p>
            <div className="flex flex-wrap gap-2">
              {CADENCE_OPTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCadenceSeconds(s)}
                  className={`px-5 py-2 rounded-lg border font-medium ${cadenceSeconds === s ? "bg-primary text-primary-foreground" : "bg-card"}`}
                >
                  {s}s
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCadenceSeconds(0)}
                className={`px-5 py-2 rounded-lg border font-medium ${cadenceSeconds === 0 ? "bg-primary text-primary-foreground" : "bg-card"}`}
              >
                Off
              </button>
            </div>
          </div>

          {/* ── Neuro-training modes ─────────────────────────────── */}
          <div>
            <Label className="mb-1 block text-base">Neuro-training modes</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Based on Huberman Lab motor-learning protocols — off by default.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMicroPauseMode(v => !v)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition active:scale-[0.985] ${
                  microPauseMode ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    ⏸ Random Neural Micro-Pauses
                  </div>
                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${microPauseMode ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {microPauseMode ? "ON" : "OFF"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  ~25% of shots trigger a 10-second freeze — motor cortex replays the swing at 20× speed
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSlowBurn(v => !v)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition active:scale-[0.985] ${
                  slowBurn ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30" : "bg-card hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">
                    🔥 Slow Burn Mode
                  </div>
                  <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${slowBurn ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {slowBurn ? "ON" : "OFF"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Swing at 15% speed — forces the motor cortex to consciously map every position
                </div>
              </button>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Block vs random</Label>
            <div className="space-y-2">
              {PRACTICE_MODES.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPracticeMode(m.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                    practiceMode === m.value ? "border-primary bg-primary/5" : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {m.value === "random" ? <Shuffle className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                    {m.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Target</Label>
              <Input value={target} onChange={e => setTarget(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Focus cue</Label>
              <select
                value={focusCue}
                onChange={e => { setFocusCue(e.target.value); setCustomCue(""); }}
                className="w-full h-11 rounded-lg border bg-card px-4 text-sm"
              >
                {getFocusCuesForBuilderFocus(focus).map((cue, i) => (
                  <option key={i} value={cue}>{cue}</option>
                ))}
              </select>
              <Input
                value={customCue}
                onChange={e => setCustomCue(e.target.value)}
                placeholder="Custom cue..."
                className="mt-2"
              />
            </div>
          </div>
          </>
          )}

          {entryMode === "library" && selectedPreset && (
            <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 px-4 py-3">
              {selectedPreset.numBlocks}×{selectedPreset.ballsPerBlock} balls · {selectedPreset.cadenceSeconds}s
              cadence · {selectedPreset.practiceMode} mode
            </p>
          )}

          {practiceMode === "random" && !skipIntentionCustom && (
            <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 px-4 py-3 -mt-2">
              <strong>Random mode:</strong> each shot gets a new random shape and trajectory during the session — no need to set one here.
            </p>
          )}

          {!skipIntention && (
            <div>
              <Label className="mb-1 block">Shot shape & trajectory</Label>
              {practiceMode === "transition" && (
                <p className="text-xs text-muted-foreground mb-2">
                  Applies to block half of the session; random half gets a new shape &amp; trajectory every shot.
                </p>
              )}
              <IntentionPicker
                shape={sessionShape}
                trajectory={sessionTrajectory}
                onShape={setSessionShape}
                onTrajectory={setSessionTrajectory}
              />
            </div>
          )}

          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" /> Deliberate Practice Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DELIBERATE_CHECKLIST.map((item, index) => (
                <label key={index} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist[index]}
                    onChange={() => toggleChecklist(index)}
                    className="mt-1 h-5 w-5 accent-primary"
                  />
                  <span className="text-sm leading-snug">{item}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full h-14 text-lg"
            disabled={entryMode === "custom" ? !canStartCustom : !canStartLibrary}
            onClick={entryMode === "custom" ? startSession : startLibrarySession}
          >
            <Play className="mr-2 h-5 w-5" />
            {entryMode === "custom"
              ? `Start Session (${totalBalls} balls)`
              : "Start Drill Session"}
          </Button>
          {((entryMode === "custom" && !canStartCustom) || (entryMode === "library" && !canStartLibrary)) && (
            <p className="text-center text-xs text-destructive">
              {!isIntentionSet
                ? "Set shot shape & trajectory to begin"
                : entryMode === "library" && !selectedPresetId
                  ? "Select a drill from the library"
                  : "Complete the checklist to begin"}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (step === "running" && sessionConfig) {
    return (
      <SessionRunnerErrorBoundary onSave={handleSessionComplete} onExit={() => setStep("wizard")}>
        <SessionRunner
          config={sessionConfig}
          onComplete={handleSessionComplete}
          onExit={() => setStep("wizard")}
          restIntervalSeconds={sessionConfig.cadenceSeconds ?? 0}
          fixedIntention={
            sessionConfig.practiceMode === "random"
              ? undefined
              : sessionShape && sessionTrajectory
                ? { shape: sessionShape, trajectory: sessionTrajectory }
                : undefined
          }
          initialRepRecords={resumeData?.repRecords}
          initialCurrentIndex={resumeData?.currentIndex}
          initialSessionStartedAt={resumeData?.sessionStartedAt}
        />
      </SessionRunnerErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-6" />
        <h1 className="text-4xl font-semibold tracking-tighter mb-3">Session Saved</h1>
        <p className="text-muted-foreground">Block results are in your history trends.</p>
        <div className="flex flex-col gap-3 mt-10">
          <Button size="lg" onClick={resetFlow}>Build Another Session</Button>
          <Link href="/history"><Button variant="outline" size="lg" className="w-full">View Trends</Button></Link>
        </div>
      </div>
    </div>
  );
}
