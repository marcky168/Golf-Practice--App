"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Target, Play, CheckCircle2, Wrench, BookOpen } from "lucide-react";
import { toast } from "sonner";

import { createBlockConfig, generateRandomSession } from "@/lib/practice/generators";
import { getClubsInBagForSkill } from "@/lib/practice/bag";
import { SKILL_CATEGORIES, getFocusCuesForSkill, getYardagePresetsForSkill, DELIBERATE_CHECKLIST } from "@/lib/practice/constants";
import { getClubBag, getPuttingStreaksByDistance, type ClubEntry } from "@/app/actions";
import type { BunkerPracticeType, SessionConfig, SkillCategory } from "@/lib/practice/types";
import { SessionRunner } from "@/components/practice/SessionRunner";
import { SessionRunnerErrorBoundary } from "@/components/practice/SessionRunnerErrorBoundary";
import { BunkerTypePicker } from "@/components/practice/BunkerTypePicker";
import { filterClubsForBunkerScenario } from "@/lib/practice/bunker-scenarios";
import {
  PUTTING_DISTANCES,
  PUTTING_BREAKS,
  generateBlockPuttingScenarios,
  generateRandomPuttingScenarios,
  puttingSessionTitle,
  type PuttingDistanceValue,
  type PuttingBreakValue,
} from "@/lib/practice/putting-scenarios";
import { IntentionPicker, type ShapeType, type TrajectoryType } from "@/components/practice/IntentionPicker";
import { ResumePrompt, clearPartialSession, type PartialSession } from "@/components/practice/ResumePrompt";
import { savePracticeSession } from "@/app/actions";
import { enrichConfigForSave, timingFromCompletion } from "@/lib/practice/session-save";
import { unlockPracticeAudio } from "@/lib/practice/feedback";
import { PreSessionRating } from "@/components/practice/PreSessionRating";
import { NeuroTrainingToggles, neuroFlagsFromState } from "@/components/practice/NeuroTrainingToggles";
import { BlockDrillLibraryList } from "@/components/practice/BlockDrillLibraryList";
import {
  BLOCK_DRILL_LIBRARY,
  loadBlockDrillPreset,
  presetNeedsIntention,
} from "@/lib/practice/block-drills";

type FlowStep = "wizard" | "pre-session" | "running" | "complete";
type EntryMode = "custom" | "library";

export default function QuickBlockPage() {
  const [step, setStep] = useState<FlowStep>("wizard");
  const [entryMode, setEntryMode] = useState<EntryMode>("custom");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const selectedPreset = BLOCK_DRILL_LIBRARY.find(d => d.id === selectedPresetId) ?? null;

  const [skillLockedFromUrl, setSkillLockedFromUrl] = useState(false);

  // Wizard state
  const [selectedSkill, setSelectedSkill] = useState<SkillCategory>("mid-irons");
  // Block vs Random — only meaningful for skills with built-in variety (irons family, wedges, putting).
  const [skillPracticeMode, setSkillPracticeMode] = useState<"block" | "random">("block");
  // Putting-only: which distance + break to groove during block mode.
  const [puttingDistance, setPuttingDistance] = useState<PuttingDistanceValue>(10);
  const [puttingBreak, setPuttingBreak] = useState<PuttingBreakValue>("straight");
  // Best make-streak the user has ever recorded at each distance ("6 ft" → 8).
  const [puttingBests, setPuttingBests] = useState<Record<string, number>>({});

  // Read ?skill= and ?mode= from URL on mount and apply to state.
  // useEffect (not useMemo at render time) — SSR strips window, and a useState
  // initial value computed during SSR sticks unless we overwrite it on the client.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawSkill = params.get("skill");
    const valid = new Set(SKILL_CATEGORIES.map(c => c.value));
    if (rawSkill && valid.has(rawSkill as SkillCategory)) {
      setSelectedSkill(rawSkill as SkillCategory);
      setSkillLockedFromUrl(true);
    }
    if (params.get("mode") === "library") setEntryMode("library");
  }, []);
  const [bunkerType, setBunkerType] = useState<BunkerPracticeType>("greenside");

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
  const [microPauseMode, setMicroPauseMode] = useState(false);
  const [slowBurn, setSlowBurn] = useState(false);
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
    getPuttingStreaksByDistance().then(setPuttingBests);
  }, []);

  React.useEffect(() => {
    const available = getClubsInBagForSkill(selectedSkill, userBag);
    if (available.length > 0 && !available.includes(selectedClub)) {
      setSelectedClub(available[0]);
    }
  }, [selectedSkill, userBag]);

  const isChecklistComplete = checklist.every(Boolean);
  // Skills with built-in variety — Block (groove one) vs Random (mix it up).
  const RANDOMIZABLE_CLUB_SKILLS: SkillCategory[] = ["mid-irons", "long-irons", "short-irons", "wedges"];
  const isPuttingScenario = selectedSkill === "putting";
  // Putting: random varies distance+break with the same putter (no club-count gate).
  // Irons/Wedges: random mixes multiple clubs (needs 2+).
  const supportsRandomMode = isPuttingScenario
    ? true
    : RANDOMIZABLE_CLUB_SKILLS.includes(selectedSkill) && clubsForSkill.length >= 2;
  const isRandomWithinSkill = supportsRandomMode && skillPracticeMode === "random";
  const skipIntentionCustom = selectedSkill === "putting" || selectedSkill === "bunker" || isRandomWithinSkill;
  const isScenarioBunker = selectedSkill === "bunker";
  const skipIntentionLibrary = selectedPreset ? !presetNeedsIntention(selectedPreset.focus) : true;
  const skipIntention = entryMode === "custom" ? skipIntentionCustom : skipIntentionLibrary;
  const isIntentionSet = skipIntention || (sessionShape !== null && sessionTrajectory !== null);
  const effectiveCue = customCue.trim() || focusCue;

  // Auto-revert to block mode if user switches to a skill where random doesn't apply.
  React.useEffect(() => {
    if (!supportsRandomMode && skillPracticeMode === "random") setSkillPracticeMode("block");
  }, [supportsRandomMode, skillPracticeMode]);

  const bunkerBagReady =
    !isScenarioBunker ||
    filterClubsForBunkerScenario(userBag.map(e => e.club), bunkerType).length > 0;

  const canStartCustom =
    isChecklistComplete &&
    isIntentionSet &&
    !bagLoading &&
    userBag.length > 0 &&
    bunkerBagReady &&
    (isScenarioBunker
      ? true
      : isRandomWithinSkill
        ? clubsForSkill.length > 0
        : clubsForSkill.length > 0 && !!selectedClub);

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
    if (!isScenarioBunker && (!isRandomWithinSkill || isPuttingScenario) && !selectedClub) {
      toast.error("Select a club from your profile bag.");
      return;
    }

    let config: SessionConfig | null;
    if (isPuttingScenario) {
      // Putting scenarios: distance + break, either fixed (block) or varied (random).
      const drills =
        skillPracticeMode === "random"
          ? generateRandomPuttingScenarios({ count: reps, putter: selectedClub })
          : generateBlockPuttingScenarios({
              count: reps,
              putter: selectedClub,
              distance: puttingDistance,
              break_: puttingBreak,
            });
      config = {
        type: "block",
        title: puttingSessionTitle({
          mode: skillPracticeMode,
          count: reps,
          distance: skillPracticeMode === "block" ? puttingDistance : undefined,
          break_: skillPracticeMode === "block" ? puttingBreak : undefined,
        }),
        durationMinutes: 0,
        focusAreas: ["putting"],
        drills,
        focusCue: effectiveCue,
        club: selectedClub,
      };
    } else if (isRandomWithinSkill) {
      // Random mix across all clubs in this skill — no warm-up (it's a focused mini-session).
      const skillLabel = SKILL_CATEGORIES.find(c => c.value === selectedSkill)?.label ?? selectedSkill;
      const generated = generateRandomSession({
        numShots: reps,
        focusAreas: [selectedSkill],
        userBag: userBag.map(e => ({ club: e.club, carry: e.carry })),
        minDistance: useYardageFilter ? minYards : undefined,
        maxDistance: useYardageFilter ? maxYards : undefined,
      });
      config = {
        ...generated,
        type: "block",
        title: `Random ${skillLabel} · ${reps} shots`,
        focusCue: effectiveCue,
      };
    } else {
      config = createBlockConfig({
        skill: selectedSkill,
        reps,
        club: selectedClub,
        target: target.trim() || undefined,
        focusCue: effectiveCue,
        minDistance: useYardageFilter ? minYards : undefined,
        maxDistance: useYardageFilter ? maxYards : undefined,
        userBag,
        bunkerType: isScenarioBunker ? bunkerType : undefined,
      });
    }

    if (!config) {
      toast.error("No clubs in your bag match this skill. Update your profile.");
      return;
    }

    setSessionConfig({ ...config, ...neuroFlagsFromState(microPauseMode, slowBurn) });
    setStep("pre-session");
    if (isPuttingScenario) {
      toast.success(
        skillPracticeMode === "random"
          ? `Random putting started — ${reps} varied shots`
          : `Block putting started — ${reps} reps`
      );
    } else if (isRandomWithinSkill) {
      toast.success(`Random mix started — ${reps} shots`);
    } else {
      toast.success(`Block session started — ${reps} reps`);
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

    setSessionConfig({ ...config, ...neuroFlagsFromState(microPauseMode, slowBurn) });
    setRestInterval(config.cadenceSeconds ?? 0);
    setStep("pre-session");
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
          <h1 className="text-3xl font-semibold tracking-tighter">Quick Block</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          One skill, one club, repeat — fast setup. Need chipping scenarios or cadence blocks? Use{" "}
          <Link href="/practice/builder" className="underline text-primary">Session Builder</Link>.
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
            <span className="font-semibold text-sm">Start from template</span>
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
          {/* Skill Picker — hidden when arriving via ?skill= (already chose from dashboard) */}
          {skillLockedFromUrl ? (
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-primary uppercase mb-0.5">
                  Practicing
                </div>
                <div className="font-semibold">
                  {SKILL_CATEGORIES.find(c => c.value === selectedSkill)?.label ?? selectedSkill}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSkillLockedFromUrl(false)}
                className="text-sm text-primary hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
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
          )}

          {/* Block vs Random — only shown when the skill has built-in variety */}
          {supportsRandomMode && (
            <div>
              <Label className="mb-2 block text-base">Practice style</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSkillPracticeMode("block")}
                  className={`rounded-xl border p-3 text-left transition active:scale-[0.985] ${
                    skillPracticeMode === "block"
                      ? "border-primary bg-primary/5"
                      : "bg-card hover:bg-muted border-border"
                  }`}
                >
                  <div className="font-semibold text-sm">Block</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isPuttingScenario ? "Same distance & break — groove it" : "Pick one club, repeat"}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSkillPracticeMode("random")}
                  className={`rounded-xl border p-3 text-left transition active:scale-[0.985] ${
                    skillPracticeMode === "random"
                      ? "border-primary bg-primary/5"
                      : "bg-card hover:bg-muted border-border"
                  }`}
                >
                  <div className="font-semibold text-sm">Random</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {isPuttingScenario ? "Vary distance + break every shot" : "Mix all clubs in this skill"}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Club — profile bag only (scenario bunker skips preset club; random-within-skill shows the mix) */}
          {isScenarioBunker ? (
            <div className="space-y-4">
              <BunkerTypePicker value={bunkerType} onChange={setBunkerType} />
            <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4 text-sm space-y-2">
              <div className="font-semibold text-primary">Scenario-based bunker play</div>
              <p className="text-muted-foreground leading-relaxed">
                Each rep presents a <strong>bunker lie</strong>, <strong>distance</strong>, and{" "}
                <strong>green to work with</strong>. You pick the club for that station — wedges for
                greenside, irons or hybrids for fairway bunkers.
              </p>
            </div>
            </div>
          ) : isRandomWithinSkill && !isPuttingScenario ? (
            <div className="rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
              <Label className="block text-base mb-1">Clubs in the mix</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Each shot picks one of these at random — same skill, varied club &amp; distance.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {clubsForSkill.map(c => (
                  <span key={c} className="px-2.5 py-1 rounded-full bg-accent/15 text-accent text-xs font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ) : (
          <div>
            <Label className="mb-2 block text-base">
              {isPuttingScenario ? "Putter (from your bag)" : "Club (from your bag)"}
            </Label>
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
          )}

          {/* Putting-only — Distance + Break pickers (block mode only) */}
          {isPuttingScenario && skillPracticeMode === "block" && (
            <>
              <div>
                <Label className="mb-1 block text-base">Distance</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Same distance every rep — groove the speed.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {PUTTING_DISTANCES.map(d => {
                    const best = puttingBests[d.label] ?? 0;
                    const isSelected = puttingDistance === d.value;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setPuttingDistance(d.value)}
                        className={`rounded-xl border p-3 text-left transition active:scale-[0.985] relative ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "bg-card hover:bg-muted border-border"
                        }`}
                      >
                        <div className="font-semibold text-sm">{d.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-snug">{d.why}</div>
                        {best > 0 && (
                          <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-1">
                            Best: {best} in a row
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {(puttingBests[PUTTING_DISTANCES.find(d => d.value === puttingDistance)?.label ?? ""] ?? 0) > 0 ? (
                  <div className="mt-3 rounded-xl border border-amber-300/60 bg-amber-50/70 dark:bg-amber-950/25 dark:border-amber-700/50 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-amber-800 dark:text-amber-200">
                      Your best at {PUTTING_DISTANCES.find(d => d.value === puttingDistance)?.label}:{" "}
                      {puttingBests[PUTTING_DISTANCES.find(d => d.value === puttingDistance)?.label ?? ""]} in a row
                    </span>
                    <span className="text-amber-700/80 dark:text-amber-300/80"> — try to beat it.</span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No streak recorded at this distance yet — set your first benchmark.
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-1 block text-base">Break</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Practicing the read is the actual skill — not the stroke.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PUTTING_BREAKS.map(b => (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => setPuttingBreak(b.value)}
                      className={`rounded-xl border p-3 text-left transition active:scale-[0.985] ${
                        puttingBreak === b.value
                          ? "border-primary bg-primary/5"
                          : "bg-card hover:bg-muted border-border"
                      }`}
                    >
                      <div className="font-semibold text-sm">{b.label}</div>
                      <div className="text-[10px] text-muted-foreground leading-snug">{b.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Putting-only — Random preview */}
          {isPuttingScenario && skillPracticeMode === "random" && (
            <div className="rounded-xl border border-accent/40 bg-accent/5 px-4 py-3">
              <div className="font-semibold text-sm mb-1">Random putting</div>
              <p className="text-xs text-muted-foreground leading-snug">
                Each shot gets a different distance ({PUTTING_DISTANCES[0].label}–{PUTTING_DISTANCES[PUTTING_DISTANCES.length - 1].label})
                and break (straight, slight/strong both ways, uphill, downhill, double). Avoids back-to-back duplicates.
              </p>
            </div>
          )}

          {/* Contextual Yardage / Range Picker (full-swing skills only — putting has its own distance picker above) */}
          {selectedSkill && selectedSkill !== "bunker" && !isPuttingScenario && (
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

          <NeuroTrainingToggles
            microPauseMode={microPauseMode}
            slowBurn={slowBurn}
            onMicroPauseChange={setMicroPauseMode}
            onSlowBurnChange={setSlowBurn}
          />

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

  if (step === "pre-session" && sessionConfig) {
    return (
      <PreSessionRating
        onComplete={(energy, focus) => {
          setSessionConfig(prev => prev ? { ...prev, preSessionState: { energy, focus } } : prev);
          setStep("running");
        }}
        onSkip={() => setStep("running")}
      />
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
          userBagClubs={userBag.map(e => e.club)}
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
          <Button size="lg" onClick={resetFlow}>Start Another Quick Block</Button>
          <Link href="/"><Button variant="outline" size="lg" className="w-full">Back to Dashboard</Button></Link>
        </div>
      </div>
    </div>
  );
}
