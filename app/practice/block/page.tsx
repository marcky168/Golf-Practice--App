"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Target, Play, CheckCircle2, Wrench, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { createBlockConfig } from "@/lib/practice/generators";
import { getClubsInBagForSkill } from "@/lib/practice/bag";
import { SKILL_CATEGORIES, getFocusCuesForSkill, getYardagePresetsForSkill, DELIBERATE_CHECKLIST } from "@/lib/practice/constants";
import { getClubBag, type ClubEntry } from "@/app/actions";
import type { SessionConfig, SkillCategory } from "@/lib/practice/types";
import { SessionRunner } from "@/components/practice/SessionRunner";
import { SessionRunnerErrorBoundary } from "@/components/practice/SessionRunnerErrorBoundary";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { ResumePrompt, clearPartialSession, type PartialSession } from "@/components/practice/ResumePrompt";
import { savePracticeSession } from "@/app/actions";
import { enrichConfigForSave, timingFromCompletion } from "@/lib/practice/session-save";
import { unlockPracticeAudio } from "@/lib/practice/feedback";
import { BlockDrillLibraryList } from "@/components/practice/BlockDrillLibraryList";
import {
  BLOCK_DRILL_LIBRARY,
  loadBlockDrillPreset,
  presetNeedsIntention,
} from "@/lib/practice/block-drills";

type FlowStep = "wizard" | "running" | "complete";
type EntryMode = "custom" | "library";

export default function BlockPracticePage() {
  const [step, setStep] = useState<FlowStep>("wizard");
  const [entryMode, setEntryMode] = useState<EntryMode>("custom");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const selectedPreset = BLOCK_DRILL_LIBRARY.find(d => d.id === selectedPresetId) ?? null;

  // Wizard state
  const [selectedSkill, setSelectedSkill] = useState<SkillCategory>("mid-irons");

  // Reset focus cue when skill changes (different skills have different cue lists)
  React.useEffect(() => {
    const cues = getFocusCuesForSkill(selectedSkill);
    if (cues.length > 0 && !cues.includes(focusCue)) {
      setFocusCue(cues[0]);
      setCustomCue("");
    }
  }, [selectedSkill]); // We intentionally omit focusCue to avoid initialization issues
  const [reps, setReps] = useState<number>(15);
  const [target, setTarget] = useState<string>("Center flag");
  const [focusCue, setFocusCue] = useState<string>(() => 
    getFocusCuesForSkill("mid-irons")[0]
  );
  const [customCue, setCustomCue] = useState<string>("");
  const [timerMinutes, setTimerMinutes] = useState<number>(25);
  const [restInterval, setRestInterval] = useState<number>(30);
  const [sessionShape, setSessionShape] = useState<ShapeType | null>(null);
  const [sessionTrajectory, setSessionTrajectory] = useState<TrajectoryType | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false]);

  // Yardage filter (for consistency with Random/Mixed)
  const [useYardageFilter, setUseYardageFilter] = useState(false);
  const [minYards, setMinYards] = useState(0);
  const [maxYards, setMaxYards] = useState(300);

  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);
  const [resumeData, setResumeData] = useState<PartialSession | null>(null);
  const [userBag, setUserBag] = useState<ClubEntry[]>([]);
  const [bagLoading, setBagLoading] = useState(true);
  const [selectedClub, setSelectedClub] = useState<string>("");

  const clubsForSkill = getClubsInBagForSkill(selectedSkill, userBag);

  React.useEffect(() => {
    getClubBag().then(bag => {
      setUserBag(bag);
      setBagLoading(false);
    });
  }, []);

  React.useEffect(() => {
    const available = getClubsInBagForSkill(selectedSkill, userBag);
    if (available.length > 0 && !available.includes(selectedClub)) {
      setSelectedClub(available[0]);
    }
  }, [selectedSkill, userBag]);

  const isChecklistComplete = checklist.every(Boolean);
  const skipIntentionCustom = selectedSkill === "putting" || selectedSkill === "bunker";
  const skipIntentionLibrary = selectedPreset ? !presetNeedsIntention(selectedPreset.focus) : true;
  const skipIntention = entryMode === "custom" ? skipIntentionCustom : skipIntentionLibrary;
  const isIntentionSet = skipIntention || (sessionShape !== null && sessionTrajectory !== null);
  const effectiveCue = customCue.trim() || focusCue;

  const canStartCustom =
    isChecklistComplete &&
    isIntentionSet &&
    !bagLoading &&
    userBag.length > 0 &&
    clubsForSkill.length > 0 &&
    !!selectedClub;

  const canStartLibrary =
    isChecklistComplete &&
    isIntentionSet &&
    !bagLoading &&
    userBag.length > 0 &&
    !!selectedPresetId &&
    (userBag.length === 0 || loadBlockDrillPreset(selectedPresetId, userBag) !== null);

  function toggleChecklist(index: number) {
    const next = [...checklist];
    next[index] = !next[index];
    setChecklist(next);
  }

  function startBlockSession() {
    unlockPracticeAudio();
    if (!isChecklistComplete || !isIntentionSet) return;
    if (!selectedClub) {
      toast.error("Select a club from your profile bag.");
      return;
    }

    const config = createBlockConfig({
      skill: selectedSkill,
      reps,
      club: selectedClub,
      target: target.trim() || undefined,
      focusCue: effectiveCue,
      minDistance: useYardageFilter ? minYards : undefined,
      maxDistance: useYardageFilter ? maxYards : undefined,
      userBag,
    });

    if (!config) {
      toast.error("No clubs in your bag match this skill. Update your profile.");
      return;
    }

    setSessionConfig(config);
    setStep("running");
    toast.success(`Block session started — ${reps} reps`);
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
    setRestInterval(config.cadenceSeconds ?? 0);
    setStep("running");
    const total = (config.ballsPerBlock ?? 0) * (config.numBlocks ?? 0) || config.drills.length;
    toast.success(`Started — ${total} shots`);
  }

  async function handleSessionComplete(result: any) {
    if (!sessionConfig) return;

    const res = await savePracticeSession({
      type: "block",
      title: sessionConfig.title,
      ...timingFromCompletion(result),
      config: enrichConfigForSave(sessionConfig, {
        repRecords: result.repRecords,
        blockResults: result.blockResults ?? [],
      }),
      reflection: result.reflection,
      notes: result.notes,
      overallFeel: result.overallFeel,
      ballsUsed: result.ballsUsed,
    });

    if (res.success) {
      setStep("complete");
      toast.success("Session saved to your history!");
    } else {
      toast.error("Failed to save session. Please try again.");
      console.error("Save error:", res.error);
    }
  }

  function resetFlow() {
    setStep("wizard");
    setEntryMode("custom");
    setSelectedPresetId(null);
    setChecklist([false, false, false]);
    setSessionConfig(null);
    setResumeData(null);
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

  // ===== WIZARD =====
  if (step === "wizard") {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
        <Link href="/practice" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Practice
        </Link>

        <ResumePrompt onResume={handleResume} onDiscard={() => clearPartialSession()} />

        <div className="flex items-center gap-3 mb-2">
          <Target className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tighter">Block Practice</h1>
        </div>
        <p className="text-muted-foreground mb-6">Deep, focused repetition — build your own or pick a drill.</p>

        <div className="grid grid-cols-2 gap-2 mb-8">
          <button
            type="button"
            onClick={() => setEntryMode("custom")}
            className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition active:scale-[0.985] ${
              entryMode === "custom" ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"
            }`}
          >
            <Wrench className="h-5 w-5 text-primary" />
            <span className="font-semibold text-sm">Custom practice</span>
            <span className="text-xs text-muted-foreground">Skill, club, reps &amp; cues</span>
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
              {userBag.length === 0 && !bagLoading && (
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
          {/* Skill Picker */}
          <div>
            <Label className="mb-3 block text-base">Skill / Club Category</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SKILL_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedSkill(cat.value)}
                  className={`h-12 rounded-xl border text-sm font-medium transition active:scale-[0.985] ${
                    selectedSkill === cat.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-muted border-border"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Club — profile bag only */}
          <div>
            <Label className="mb-2 block text-base">Club (from your bag)</Label>
            {bagLoading ? (
              <p className="text-sm text-muted-foreground">Loading your clubs…</p>
            ) : userBag.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Add clubs on your{" "}
                <Link href="/profile" className="underline text-primary">Profile</Link>{" "}
                to practice with your real bag.
              </p>
            ) : clubsForSkill.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No clubs in your bag match this skill. Pick another category or update your{" "}
                <Link href="/profile" className="underline text-primary">Profile</Link>.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {clubsForSkill.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedClub(c)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition active:scale-[0.985] ${
                      selectedClub === c
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-muted border-border"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contextual Yardage / Range Picker (appears after skill is chosen) */}
          {selectedSkill && (
            <div>
              <Label className="mb-2 block text-base">Distance / Range</Label>
              <div className="flex flex-wrap gap-2">
                {getYardagePresetsForSkill(selectedSkill).map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setMinYards(preset.min);
                      setMaxYards(preset.max);
                      setUseYardageFilter(true);
                    }}
                    className={`px-4 py-2 rounded-full border text-sm transition active:scale-[0.985] ${
                      useYardageFilter && minYards === preset.min && maxYards === preset.max
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-muted border-border"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setUseYardageFilter(false);
                    setMinYards(0);
                    setMaxYards(300);
                  }}
                  className={`px-4 py-2 rounded-full border text-sm transition active:scale-[0.985] ${
                    !useYardageFilter
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-muted border-border"
                  }`}
                >
                  Any distance
                </button>
              </div>

              {/* Optional manual range */}
              {useYardageFilter && (
                <div className="flex items-center gap-3 mt-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Min yards</div>
                    <input
                      type="number"
                      value={minYards}
                      onChange={(e) => setMinYards(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-24 rounded-lg border bg-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Max yards</div>
                    <input
                      type="number"
                      value={maxYards}
                      onChange={(e) => setMaxYards(Math.max(minYards, parseInt(e.target.value) || 300))}
                      className="w-24 rounded-lg border bg-card px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reps + Target */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">Number of Reps</Label>
              <div className="flex flex-wrap gap-2">
                {[8, 12, 15, 20, 30].map((n) => (
                  <button
                    key={n}
                    onClick={() => setReps(n)}
                    className={`px-5 py-2 rounded-lg border font-medium ${reps === n ? "bg-primary text-primary-foreground" : "bg-card"}`}
                  >
                    {n}
                  </button>
                ))}
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(Math.max(3, Math.min(50, parseInt(e.target.value) || 10)))}
                  className="w-20 px-3 py-2 rounded-lg border bg-card text-center font-medium"
                />
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Target</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Center flag at 150yd" />
            </div>
          </div>

          {/* Focus Cue */}
          <div>
            <Label className="mb-2 block">Focus Cue (one thing)</Label>
            <select
              value={focusCue}
              onChange={(e) => { setFocusCue(e.target.value); setCustomCue(""); }}
              className="w-full h-11 rounded-lg border bg-card px-4 text-sm"
            >
              {getFocusCuesForSkill(selectedSkill).map((cue, i) => (
                <option key={i} value={cue}>{cue}</option>
              ))}
            </select>
            <Input
              value={customCue}
              onChange={(e) => setCustomCue(e.target.value)}
              placeholder="Or type your own cue..."
              className="mt-2"
            />
          </div>

          {/* Timer */}
          <div>
            <Label className="mb-2 block">Session Timer</Label>
            <div className="flex flex-wrap gap-2">
              {[0, 15, 25, 40, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setTimerMinutes(m)}
                  className={`px-5 py-2 rounded-lg border font-medium ${timerMinutes === m ? "bg-primary text-primary-foreground" : "bg-card"}`}
                >
                  {m === 0 ? "Self-paced" : `${m} min`}
                </button>
              ))}
            </div>
          </div>



          {/* Rest Between Reps */}
          <div>
            <Label className="mb-1 block">Rest Between Reps</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Brief enforced rests let your brain encode each rep before the next. Spaced &gt; massed.
            </p>
            <div className="flex flex-wrap gap-2">
              {[0, 15, 30, 45].map((s) => (
                <button
                  key={s}
                  onClick={() => setRestInterval(s)}
                  className={`px-5 py-2 rounded-lg border font-medium ${restInterval === s ? "bg-primary text-primary-foreground" : "bg-card"}`}
                >
                  {s === 0 ? "None" : `${s} sec`}
                </button>
              ))}
            </div>
          </div>
          </>
          )}

          {!skipIntention && (
            <div>
              <Label className="mb-1 block">Shot Shape &amp; Trajectory</Label>
              <p className="text-xs text-muted-foreground mb-3">
                Set once — applies to every rep in this session.
              </p>
              <IntentionPicker
                shape={sessionShape}
                trajectory={sessionTrajectory}
                onShape={setSessionShape}
                onTrajectory={setSessionTrajectory}
              />
            </div>
          )}

          {entryMode === "library" && selectedPreset && (
            <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 px-4 py-3">
              Rest cadence: {selectedPreset.cadenceSeconds}s between shots (from drill preset).
            </p>
          )}

          {/* Deliberate Checklist */}
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
            onClick={entryMode === "custom" ? startBlockSession : startLibrarySession}
          >
            <Play className="mr-2 h-5 w-5" />
            {entryMode === "custom" ? "Start Focused Block Session" : "Start Drill Session"}
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

  // ===== RUNNING (reuses shared SessionRunner) =====
  if (step === "running" && sessionConfig) {
    return (
      <SessionRunnerErrorBoundary onSave={handleSessionComplete} onExit={() => setStep("wizard")}>
        <SessionRunner
          config={sessionConfig}
          onComplete={handleSessionComplete}
          onExit={() => setStep("wizard")}
          restIntervalSeconds={restInterval}
          fixedIntention={sessionShape && sessionTrajectory ? { shape: sessionShape, trajectory: sessionTrajectory } : undefined}
          initialRepRecords={resumeData?.repRecords}
          initialCurrentIndex={resumeData?.currentIndex}
          initialSessionStartedAt={resumeData?.sessionStartedAt}
        />
      </SessionRunnerErrorBoundary>
    );
  }

  // ===== COMPLETE =====
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <CheckCircle2 className="w-9 h-9 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tighter mb-3">Session Saved</h1>
        <p className="text-xl text-muted-foreground">Excellent deliberate work.</p>

        <div className="flex flex-col gap-3 mt-10">
          <Button size="lg" onClick={resetFlow}>Start Another Block Session</Button>
          <Link href="/"><Button variant="outline" size="lg" className="w-full">Back to Dashboard</Button></Link>
        </div>
      </div>
    </div>
  );
}
