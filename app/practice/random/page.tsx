"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Shuffle, Play, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { generateRandomSessionWithWarmup } from "@/lib/practice/generators";
import { SKILL_CATEGORIES, getYardagePresetsForAreas } from "@/lib/practice/constants";
import type { SessionConfig, SkillCategory } from "@/lib/practice/types";
import { SessionRunner } from "@/components/practice/SessionRunner";
import { SessionRunnerErrorBoundary } from "@/components/practice/SessionRunnerErrorBoundary";
import { SHAPES, TRAJECTORIES, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { ResumePrompt, clearPartialSession, type PartialSession } from "@/components/practice/ResumePrompt";
import { savePracticeSession, getClubBag } from "@/app/actions";
import { enrichConfigForSave, timingFromCompletion } from "@/lib/practice/session-save";
import { unlockPracticeAudio } from "@/lib/practice/feedback";
import { NeuroTrainingToggles, neuroFlagsFromState } from "@/components/practice/NeuroTrainingToggles";

type Intention  = { shape: ShapeType; trajectory: TrajectoryType };
type BagEntry   = { club: string; carry: number };

function randomIntention(): Intention {
  return {
    shape:      SHAPES[Math.floor(Math.random() * SHAPES.length)],
    trajectory: TRAJECTORIES[Math.floor(Math.random() * TRAJECTORIES.length)],
  };
}

type FlowStep = "config" | "running" | "complete";

export default function RandomPracticePage() {
  const [step, setStep] = useState<FlowStep>("config");

  // Config state
  const [duration, setDuration] = useState<number>(45);
  const [numShots, setNumShots] = useState<number>(60);
  const [useDuration, setUseDuration] = useState<boolean>(true);
  const [selectedAreas, setSelectedAreas] = useState<SkillCategory[]>([]);

  // Yardage range filter (optional)
  const [minYards, setMinYards] = useState<number>(0);
  const [maxYards, setMaxYards] = useState<number>(300);
  const [useYardageFilter, setUseYardageFilter] = useState<boolean>(false);

  const [generatedConfig, setGeneratedConfig] = useState<SessionConfig | null>(null);
  const [drillIntentions, setDrillIntentions] = useState<Intention[]>([]);
  const [resumeData, setResumeData] = useState<PartialSession | null>(null);
  const [restInterval, setRestInterval] = useState<number>(0);
  const [microPauseMode, setMicroPauseMode] = useState(false);
  const [slowBurn, setSlowBurn] = useState(false);
  const [userBag, setUserBag] = useState<BagEntry[]>([]);

  useEffect(() => {
    getClubBag().then(setUserBag);
  }, []);

  const allAreas = SKILL_CATEGORIES.map(c => c.value);

  function toggleArea(area: SkillCategory) {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  }

  function generateAndStart() {
    unlockPracticeAudio();
    const config = generateRandomSessionWithWarmup({
      durationMinutes: useDuration ? duration : undefined,
      numShots: !useDuration ? numShots : undefined,
      focusAreas: selectedAreas,
      userBag: userBag.length > 0 ? userBag : undefined,
      minDistance: useYardageFilter ? minYards : undefined,
      maxDistance: useYardageFilter ? maxYards : undefined,
    });

    setGeneratedConfig({ ...config, ...neuroFlagsFromState(microPauseMode, slowBurn) });
    setDrillIntentions(config.drills.map(randomIntention));
    setStep("running");
    const warm = config.warmupShotCount ?? 0;
    toast.success(
      warm > 0
        ? `${warm} warm-up shots (short clubs), then ${config.drills.length - warm} practice shots`
        : `Random session generated — ${config.drills.length} varied shots`
    );
  }

  async function handleComplete(result: any) {
    if (!generatedConfig) return;

    const res = await savePracticeSession({
      type: "random",
      title: generatedConfig.title,
      ...timingFromCompletion(result),
      config: enrichConfigForSave(generatedConfig, {
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
      toast.success("Random session saved!");
    } else {
      toast.error("Failed to save. Please try again.");
    }
  }

  function resetFlow() {
    setStep("config");
    setGeneratedConfig(null);
    setResumeData(null);
  }

  function handleResume(saved: PartialSession) {
    unlockPracticeAudio();
    setGeneratedConfig(saved.config);
    setDrillIntentions(saved.drillIntentions ?? []);
    setResumeData(saved);
    setStep("running");
  }

  // ===== CONFIG SCREEN =====
  if (step === "config") {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
        <Link href="/practice" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Practice
        </Link>

        <ResumePrompt onResume={handleResume} onDiscard={() => clearPartialSession()} />

        <div className="flex items-center gap-3 mb-2">
          <Shuffle className="h-8 w-8 text-accent" />
          <h1 className="text-3xl font-semibold tracking-tighter">Random Practice</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Interleaved, game-like drills. Best for transferring skills to the course.
        </p>

        <div className="space-y-8">
          {/* Length */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Session Length</div>
              <div className="text-xs text-muted-foreground">Choose one</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setUseDuration(true)}
                className={`rounded-xl border p-4 text-left transition ${useDuration ? "border-primary bg-primary/5" : "bg-card"}`}
              >
                <div className="font-semibold text-lg">By Time</div>
                <div className="text-sm text-muted-foreground">45–75 min recommended</div>
              </button>
              <button
                onClick={() => setUseDuration(false)}
                className={`rounded-xl border p-4 text-left transition ${!useDuration ? "border-primary bg-primary/5" : "bg-card"}`}
              >
                <div className="font-semibold text-lg">By Shots</div>
                <div className="text-sm text-muted-foreground">40–80 shots</div>
              </button>
            </div>

            {useDuration ? (
              <div className="flex flex-wrap gap-2">
                {[30, 45, 60, 75].map((m) => (
                  <button
                    key={m}
                    onClick={() => setDuration(m)}
                    className={`px-6 py-2 rounded-lg border font-medium ${duration === m ? "bg-primary text-primary-foreground" : "bg-card"}`}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[40, 55, 70, 85].map((n) => (
                  <button
                    key={n}
                    onClick={() => setNumShots(n)}
                    className={`px-6 py-2 rounded-lg border font-medium ${numShots === n ? "bg-primary text-primary-foreground" : "bg-card"}`}
                  >
                    {n} shots
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Focus Areas (multi-select) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium">Focus Areas</div>
              {selectedAreas.length === 0 && (
                <span className="text-xs text-destructive font-medium">Select at least one area</span>
              )}
              {selectedAreas.length > 0 && (
                <span className="text-xs text-muted-foreground">{selectedAreas.length} selected</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {SKILL_CATEGORIES.map((cat) => {
                const active = selectedAreas.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    onClick={() => toggleArea(cat.value)}
                    className={`px-4 py-2 rounded-full border text-sm transition active:scale-[0.985] ${
                      active
                        ? "bg-accent text-accent-foreground border-accent"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              The generator will create varied, non-repetitive shots across these areas.
            </p>
          </div>

          {/* Yardage Range (contextual to selected focus areas) */}
          <div>
            <Label className="mb-2 block text-base">Distance / Range</Label>

            <div className="flex flex-wrap gap-2 mb-3">
              {getYardagePresetsForAreas(selectedAreas).map((preset) => (
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

            {useYardageFilter && (
              <div className="flex items-center gap-4">
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

          {/* Rest Between Reps */}
          <div>
            <div className="mb-1 font-medium">Rest Between Reps</div>
            <p className="text-xs text-muted-foreground mb-2">
              Brief enforced rests help your brain consolidate each shot before the next.
              Sounds play on rest timers — tap Start below once to enable on iPhone.
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

          <NeuroTrainingToggles
            microPauseMode={microPauseMode}
            slowBurn={slowBurn}
            onMicroPauseChange={setMicroPauseMode}
            onSlowBurnChange={setSlowBurn}
          />

          {/* Preview info */}
          <Card className="bg-muted/50 border-none">
            <CardContent className="pt-5 text-sm">
              <div className="font-medium mb-1">What to expect</div>
              <ul className="text-muted-foreground space-y-1 list-disc pl-5">
                <li>Starts with ~10 short-club warm-up shots (putting → wedges)</li>
                <li>Tap “End warm-up” when ready — then full random practice begins</li>
                <li>Practice shots vary club, distance, target, and shape</li>
                <li>Warm-up and practice are clearly labeled during the session</li>
              </ul>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={generateAndStart}
            disabled={selectedAreas.length === 0}
          >
            <Play className="mr-2 h-5 w-5" /> Generate &amp; Start Random Session
          </Button>
          {selectedAreas.length === 0 && (
            <p className="text-center text-sm text-muted-foreground -mt-2">
              Choose your focus areas above to begin
            </p>
          )}
        </div>
      </div>
    );
  }

  // ===== RUNNING (uses shared SessionRunner) =====
  if (step === "running" && generatedConfig) {
    return (
      <SessionRunnerErrorBoundary onSave={handleComplete} onExit={() => setStep("config")}>
        <SessionRunner
          config={generatedConfig}
          onComplete={handleComplete}
          onExit={() => setStep("config")}
          drillIntentions={drillIntentions}
          restIntervalSeconds={restInterval}
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
        <h1 className="text-4xl font-semibold tracking-tighter mb-3">Random Session Logged</h1>
        <p className="text-xl text-muted-foreground">This kind of practice transfers best to the course.</p>

        <div className="flex flex-col gap-3 mt-10">
          <Button size="lg" onClick={resetFlow}>Generate Another Random Session</Button>
          <Link href="/"><Button variant="outline" size="lg" className="w-full">Back to Dashboard</Button></Link>
        </div>
      </div>
    </div>
  );
}
