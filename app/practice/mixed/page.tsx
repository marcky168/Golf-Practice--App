"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, TrendingUp, Info, Play } from "lucide-react";
import { toast } from "sonner";
import { SessionRunner } from "@/components/practice/SessionRunner";
import { SessionRunnerErrorBoundary } from "@/components/practice/SessionRunnerErrorBoundary";
import { generateMixedSession } from "@/lib/practice/generators";
import { SKILL_CATEGORIES, getYardagePresetsForAreas } from "@/lib/practice/constants";
import type { SkillCategory, SessionConfig } from "@/lib/practice/types";
import { savePracticeSession, getClubBag } from "@/app/actions";
import { enrichConfigForSave, timingFromCompletion } from "@/lib/practice/session-save";
import { ResumePrompt, clearPartialSession, type PartialSession } from "@/components/practice/ResumePrompt";
import { loadLastMixedConfig, saveLastMixedConfig } from "@/lib/practice/last-mixed-config";
import { unlockPracticeAudio } from "@/lib/practice/feedback";
import { NeuroTrainingToggles, neuroFlagsFromState } from "@/components/practice/NeuroTrainingToggles";

export default function MixedSessionPage() {
  const [step, setStep] = useState<"config" | "running" | "complete">("config");
  const [duration, setDuration] = useState(60);
  const [selectedAreas, setSelectedAreas] = useState<SkillCategory[]>([]);
  const [restInterval, setRestInterval] = useState<number>(0);
  const [microPauseMode, setMicroPauseMode] = useState(false);
  const [slowBurn, setSlowBurn] = useState(false);

  // Yardage filter (contextual to focus areas)
  const [useYardageFilter, setUseYardageFilter] = useState(false);
  const [minYards, setMinYards] = useState(0);
  const [maxYards, setMaxYards] = useState(300);

  const [generatedConfig, setGeneratedConfig] = useState<SessionConfig | null>(null);
  const [resumeData, setResumeData] = useState<PartialSession | null>(null);
  const [userBag, setUserBag] = useState<{ club: string; carry: number }[]>([]);

  const runSession = useCallback(
    (bag: { club: string; carry: number }[], opts: {
      durationMinutes: number;
      focusAreas: SkillCategory[];
      restIntervalSeconds: number;
      useYardageFilter: boolean;
      minYards: number;
      maxYards: number;
      toastMessage?: string;
      unlockOnStart?: boolean;
      microPauseMode?: boolean;
      slowBurn?: boolean;
    }) => {
      if (opts.unlockOnStart !== false) unlockPracticeAudio();
      setRestInterval(opts.restIntervalSeconds);
      const config = generateMixedSession({
        durationMinutes: opts.durationMinutes,
        focusAreas: opts.focusAreas,
        userBag: bag.length > 0 ? bag : undefined,
        minDistance: opts.useYardageFilter ? opts.minYards : undefined,
        maxDistance: opts.useYardageFilter ? opts.maxYards : undefined,
      });
      const fullConfig = {
        ...config,
        ...neuroFlagsFromState(!!opts.microPauseMode, !!opts.slowBurn),
      };
      setGeneratedConfig(fullConfig);
      setStep("running");
      saveLastMixedConfig({
        title: config.title,
        duration: opts.durationMinutes,
        selectedAreas: opts.focusAreas,
        restInterval: opts.restIntervalSeconds,
        useYardageFilter: opts.useYardageFilter,
        minYards: opts.minYards,
        maxYards: opts.maxYards,
        microPauseMode: opts.microPauseMode,
        slowBurn: opts.slowBurn,
      });
      toast.success(opts.toastMessage ?? `Mixed session generated — ${config.drills.length} shots`);
      return config;
    },
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isRepeat = params.get("repeat") === "1";

    getClubBag().then(bag => {
      setUserBag(bag);

      if (isRepeat) {
        const stored = loadLastMixedConfig();
        if (stored && stored.selectedAreas.length > 0) {
          setDuration(stored.duration);
          setSelectedAreas(stored.selectedAreas);
          setUseYardageFilter(stored.useYardageFilter);
          setMinYards(stored.minYards);
          setMaxYards(stored.maxYards);
          setMicroPauseMode(!!stored.microPauseMode);
          setSlowBurn(!!stored.slowBurn);
          runSession(bag, {
            durationMinutes: stored.duration,
            focusAreas: stored.selectedAreas,
            restIntervalSeconds: stored.restInterval,
            useYardageFilter: stored.useYardageFilter,
            minYards: stored.minYards,
            maxYards: stored.maxYards,
            microPauseMode: stored.microPauseMode,
            slowBurn: stored.slowBurn,
            toastMessage: "Repeating last mixed session — fresh shots, same setup",
          });
          const url = new URL(window.location.href);
          url.searchParams.delete("repeat");
          window.history.replaceState({}, "", url.toString());
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount: bag load + optional one-shot repeat
  }, []);

  const toggleArea = (area: SkillCategory) => {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
    } else {
      setSelectedAreas([...selectedAreas, area]);
    }
  };

  const generateAndStart = () => {
    runSession(userBag, {
      durationMinutes: duration,
      focusAreas: selectedAreas,
      restIntervalSeconds: restInterval,
      useYardageFilter,
      minYards,
      maxYards,
      microPauseMode,
      slowBurn,
    });
  };

  const handleComplete = async (result: any) => {
    if (!generatedConfig) return;

    const res = await savePracticeSession({
      type: "mixed",
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
      toast.success("Session saved to your history!");
    } else {
      toast.error("Failed to save session. Please try again.");
      console.error("Save error:", res.error);
    }
  };

  const resetFlow = () => {
    setStep("config");
    setGeneratedConfig(null);
    setResumeData(null);
  };

  const handleResume = (saved: PartialSession) => {
    unlockPracticeAudio();
    setGeneratedConfig(saved.config);
    setResumeData(saved);
    setStep("running");
  };

  // === CONFIG SCREEN ===
  if (step === "config") {
    return (
      <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
        <Link href="/practice" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Practice
        </Link>

        <ResumePrompt onResume={handleResume} onDiscard={() => clearPartialSession()} />

        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-semibold tracking-tighter">Mixed Sessions</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          A smart hybrid: short block warm-up followed by randomized, game-like practice.
        </p>

        {/* Why Mixed Sessions Work */}
        <div className="mb-8 rounded-2xl border bg-muted/40 p-5 text-sm">
          <div className="flex items-center gap-2 font-medium mb-2">
            <Info className="h-4 w-4 text-primary" />
            Why This Format Works Well
          </div>
          <p className="text-muted-foreground leading-relaxed">
            A short block warm-up helps you “get the feel” for the session (great for grooving mechanics), 
            while the randomized main portion builds the adaptability and decision-making that actually 
            transfers to the course. Research in motor learning shows this combination often delivers 
            the best of both worlds.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-3 font-medium">Session Length</div>
            <div className="flex flex-wrap gap-2">
              {[45, 60, 75, 90].map((m) => (
                <button key={m} onClick={() => setDuration(m)} className={`px-6 py-2 rounded-lg border font-medium ${duration === m ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  {m} min
                </button>
              ))}
            </div>
          </div>

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
                  <button key={cat.value} onClick={() => toggleArea(cat.value)} className={`px-4 py-2 rounded-full border text-sm transition ${active ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                    {cat.label}
                  </button>
                );
              })}
            </div>
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

          <Button
            size="lg"
            className="w-full h-14 text-lg"
            onClick={generateAndStart}
            disabled={selectedAreas.length === 0}
          >
            <Play className="mr-2 h-5 w-5" /> Generate Mixed Session
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

  // === RUNNING ===
  if (step === "running" && generatedConfig) {
    return (
      <SessionRunnerErrorBoundary onSave={handleComplete} onExit={() => setStep("config")}>
        <SessionRunner
          config={generatedConfig}
          onComplete={handleComplete}
          onExit={() => setStep("config")}
          restIntervalSeconds={restInterval}
          initialRepRecords={resumeData?.repRecords}
          initialCurrentIndex={resumeData?.currentIndex}
          initialSessionStartedAt={resumeData?.sessionStartedAt}
        />
      </SessionRunnerErrorBoundary>
    );
  }

  // === COMPLETE ===
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <TrendingUp className="w-9 h-9 text-emerald-600" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tighter mb-3">Mixed Session Complete</h1>
        <p className="text-xl text-muted-foreground">Great hybrid session.</p>

        <div className="flex flex-col gap-3 mt-10">
          <Button size="lg" onClick={resetFlow}>Start Another Mixed Session</Button>
          <Link href="/"><Button variant="outline" size="lg" className="w-full">Back to Dashboard</Button></Link>
        </div>
      </div>
    </div>
  );
}
