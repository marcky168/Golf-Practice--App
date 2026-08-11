"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, CheckCircle2, Clock, BookOpen, Brain, Mic, AlertCircle, Wrench } from "lucide-react";
import { toast } from "sonner";
import type { Program, ProgramPhase, ProgramSessionLog, ProgramSessionStep } from "@/lib/programs/types";
import { CueCardDisplay } from "./CueCardDisplay";
import { MetronomePanel } from "./MetronomePanel";
import { ModuleTargets } from "./ModuleTargets";
import { EquipmentToggles } from "@/components/practice/EquipmentToggles";
import { savePracticeSession } from "@/app/actions";
import { unlockPracticeAudio } from "@/lib/practice/feedback";
import { nextTargetScore } from "@/lib/practice/game-scores";
import { useProgramGameScores, type GameScoreSummary } from "./useProgramGameScores";
import { useSessionImmersive } from "@/lib/use-session-immersive";
import {
  DEFAULT_TECH_TARGETS,
  DEVICE_INFO,
  NO_EQUIPMENT,
  anyDeviceActive,
  type EquipmentSelection,
  type HackMotionSetup,
  type TechMetricKey,
  type TechTargets,
} from "@/lib/practice/equipment";

interface Props {
  program: Program;
  phase: ProgramPhase;
  sessionInPhase: number;
  /** URL ?step= — jump into a section for testing */
  initialStep?: ProgramSessionStep;
  /** Show step picker in header when practicing / testing */
  allowStepPicker?: boolean;
  /** True when session started via ?phase= override (practice, not auto-advance) */
  practiceMode?: boolean;
}

// ── Countdown timer hook ──────────────────────────────────────────────────────
// Derives remaining time from a wall-clock end timestamp rather than decrementing
// state, so it stays accurate when iOS Safari suspends timers on screen-lock /
// backgrounding (exactly what happens during the eyes-closed rest phases). A
// visibilitychange re-sync catches up the instant the phone is unlocked.
function useCountdown(initialSeconds: number, active: boolean, onDone?: () => void) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active) {
      setSecondsLeft(initialSeconds);
      return;
    }
    const endAt = Date.now() + initialSeconds * 1000;
    let fired = false;

    const tick = () => {
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !fired) {
        fired = true;
        onDoneRef.current?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, initialSeconds]);

  return secondsLeft;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── Main runner ───────────────────────────────────────────────────────────────
export function ProgramSessionRunner({
  program,
  phase,
  sessionInPhase,
  initialStep,
  allowStepPicker = false,
  practiceMode = false,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState<ProgramSessionStep>(initialStep ?? "intro");
  useSessionImmersive(true);
  const sessionStartRef = useRef<number>(Date.now());
  // Only modules that declare an equipment plan get the toggle step — programs
  // written before this feature keep their original flow untouched.
  const hasEquipmentStep = Boolean(phase.equipment?.length);
  const phaseNoun = program.phaseNoun ?? "Phase";
  const shellNav = {
    hasEquipmentStep,
    ...(allowStepPicker ? { allowStepPicker: true as const, onStepChange: setStep } : {}),
  };

  // Tracking sheet state
  const [goodShots, setGoodShots]   = useState(0);
  const [totalShots, setTotalShots] = useState(0);
  const [bestFeel, setBestFeel]     = useState("");
  const [oneThingNext, setOneThingNext] = useState("");
  const [checks, setChecks] = useState({
    warmupDone:                  false,
    cueCardRead:                 false,
    preSessionVisualization:     false,
    idleRestDone:                false,
    verbalRecapDone:             false,
    preSleepVisualizationPlanned: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Equipment — every device off until the user opts in for this session.
  const [devices, setDevices] = useState<EquipmentSelection>({ ...NO_EQUIPMENT });
  const techTargets = phase.techTargets ?? DEFAULT_TECH_TARGETS;
  const techMetrics = phase.techMetrics ?? [];
  const equipmentActive = anyDeviceActive(devices);

  function advance(to: ProgramSessionStep) {
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleCheck(key: keyof typeof checks) {
    setChecks(c => ({ ...c, [key]: !c[key] }));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    const safeGood = Math.min(goodShots, totalShots);
    const goodPct = totalShots > 0 ? Math.round((safeGood / totalShots) * 100) : 0;
    const log: ProgramSessionLog = {
      programId:    program.id,
      phaseId:      phase.id,
      sessionInPhase,
      goodShots:    safeGood,
      totalShots,
      goodPct,
      bestFeel:     bestFeel.trim() || undefined,
      oneThingNext: oneThingNext.trim() || undefined,
      checks,
      // Practice-mode runs must never advance/regress the user's real phase.
      ...(practiceMode ? { practiceMode: true } : {}),
      // Equipment is only recorded when something was actually switched on, so
      // feel-only sessions stay exactly as they were before this feature.
      ...(equipmentActive ? { equipment: devices } : {}),
    };
    const durationMinutes = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60_000));
    const startedAt = new Date(sessionStartRef.current).toISOString();
    const endedAt   = new Date().toISOString();

    try {
      const res = await savePracticeSession({
        type:  "block",
        title: `${program.name} — ${phaseNoun} ${phase.number}: ${phase.name}`,
        durationMinutes,
        startedAt,
        endedAt,
        config: {
          // Existing required fields on SessionConfig
          type:           "block",
          title:          `${program.name} — ${phaseNoun} ${phase.number}`,
          durationMinutes,
          focusAreas:     [],
          drills:         [],
          // Program-specific:
          programId:      program.id,
          programLog:     log,
        } as any,
        score: goodPct,
      });

      if (res.success) {
        setSaved(true);
        toast.success(practiceMode ? "Practice session saved" : "Session saved");
        setTimeout(() => router.push(`/programs/${program.id}`), 800);
      } else {
        toast.error("Save failed — try again");
      }
    } catch {
      toast.error("Save failed — check your connection and try again");
    } finally {
      setSaving(false);
    }
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <PageShell program={program} phase={phase} step={step} {...shellNav}>
        {practiceMode && (
          <div className="rounded-xl border border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/25 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 mb-4">
            Practice mode — this session won&apos;t change your phase until you save with real tracking.
          </div>
        )}
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Before you start</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Read the cue card. Close your eyes. Visualise 5 perfect reps. Two minutes.
        </p>

        <CueCardDisplay card={phase.cueCard} />

        <div className="rounded-xl border bg-card px-4 py-3 mt-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checks.cueCardRead}
              onChange={() => toggleCheck("cueCardRead")}
              className="mt-1 h-5 w-5 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">I've read the cue card</div>
              <div className="text-xs text-muted-foreground">Out loud is even better.</div>
            </div>
          </label>
        </div>

        <div className="rounded-xl border bg-card px-4 py-3 mt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checks.preSessionVisualization}
              onChange={() => toggleCheck("preSessionVisualization")}
              className="mt-1 h-5 w-5 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">Visualised 5 perfect reps</div>
              <div className="text-xs text-muted-foreground">2 min, eyes closed.</div>
            </div>
          </label>
        </div>

        <Button
          size="lg"
          className="w-full h-14 mt-6"
          onClick={() => { unlockPracticeAudio(); advance(hasEquipmentStep ? "equipment" : "warmup"); }}
        >
          <ArrowRight className="mr-2 h-5 w-5" />
          {hasEquipmentStep ? "Next — equipment" : "Start warm-up"}
        </Button>
      </PageShell>
    );
  }

  // ── EQUIPMENT ──────────────────────────────────────────────────────────────
  if (step === "equipment") {
    return (
      <PageShell program={program} phase={phase} step={step} {...shellNav}>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">What have you got today?</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Everything here is optional. Leave it all off and the module runs on feel — the
          structure doesn&apos;t change.
        </p>

        <EquipmentToggles devices={devices} onChange={setDevices} plan={phase.equipment} />

        {equipmentActive && (
          <div className="mt-6">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
              Set up like this
            </div>
            <ModuleTargets
              devices={devices}
              metrics={techMetrics}
              targets={techTargets}
              hackMotion={phase.hackMotion}
            />
          </div>
        )}

        <Button size="lg" className="w-full h-14 mt-6" onClick={() => advance("warmup")}>
          <ArrowRight className="mr-2 h-5 w-5" />
          {equipmentActive ? "Start warm-up" : "Skip tech — start warm-up"}
        </Button>
      </PageShell>
    );
  }

  // ── WARMUP ─────────────────────────────────────────────────────────────────
  if (step === "warmup") {
    const warmup = phase.warmup ?? program.warmup;
    return (
      <PageShell program={program} phase={phase} step={step} {...shellNav}>
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Warm-up</h2>
        <p className="text-sm text-muted-foreground mb-5">
          {warmup.totalDuration}. Mobility → movement prep → dynamic swings.
        </p>

        <div className="space-y-2 mb-6">
          {warmup.blocks.map((b, i) => (
            <div key={i} className="rounded-xl border bg-card px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Block {i + 1}
                </span>
                <span className="text-xs text-muted-foreground">{b.duration}</span>
              </div>
              <p className="text-sm leading-snug">{b.description}</p>
            </div>
          ))}
        </div>

        <label className="flex items-start gap-3 cursor-pointer rounded-xl border bg-card px-4 py-3 mb-4">
          <input
            type="checkbox"
            checked={checks.warmupDone}
            onChange={() => toggleCheck("warmupDone")}
            className="mt-1 h-5 w-5 accent-primary"
          />
          <div>
            <div className="text-sm font-medium">Warm-up complete</div>
            <div className="text-xs text-muted-foreground">Body feels loose, ready to swing.</div>
          </div>
        </label>

        <Button
          size="lg"
          className="w-full h-14"
          onClick={() => advance("compile-1")}
          disabled={!checks.warmupDone}
        >
          <ArrowRight className="mr-2 h-5 w-5" /> Start Compile Block 1
        </Button>
      </PageShell>
    );
  }

  // ── COMPILE BLOCK 1 ────────────────────────────────────────────────────────
  if (step === "compile-1") {
    return (
      <CompileBlock
        program={program}
        phase={phase}
        blockNumber={1}
        blockDuration="20 min"
        onContinue={() => advance("micro-rest")}
        continueLabel="Done — micro-rest"
        devices={devices}
        techMetrics={techMetrics}
        techTargets={techTargets}
        hackMotion={phase.hackMotion}
        {...shellNav}
      />
    );
  }

  // ── MICRO-REST ─────────────────────────────────────────────────────────────
  if (step === "micro-rest") {
    return <MicroRest onContinue={() => advance("compile-2")} program={program} phase={phase} {...shellNav} />;
  }

  // ── COMPILE BLOCK 2 ────────────────────────────────────────────────────────
  if (step === "compile-2") {
    return (
      <CompileBlock
        program={program}
        phase={phase}
        blockNumber={2}
        blockDuration="15–20 min"
        onContinue={() => advance("consolidate")}
        continueLabel="Done — start idle rest"
        devices={devices}
        techMetrics={techMetrics}
        techTargets={techTargets}
        hackMotion={phase.hackMotion}
        {...shellNav}
      />
    );
  }

  // ── CONSOLIDATE (idle rest) ────────────────────────────────────────────────
  if (step === "consolidate") {
    return (
      <Consolidate
        minutes={phase.consolidate.idleRestMinutes}
        onDone={() => { setChecks(c => ({ ...c, idleRestDone: true })); advance("recap"); }}
        onSkip={() => advance("recap")}
        program={program}
        phase={phase}
        {...shellNav}
      />
    );
  }

  // ── VERBAL RECAP ───────────────────────────────────────────────────────────
  if (step === "recap") {
    return (
      <PageShell program={program} phase={phase} step={step} {...shellNav}>
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Verbal recap</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Say it out loud. Verbalising exposes gaps that thinking doesn't.
        </p>

        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 px-5 py-4 mb-5">
          <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-1">
            Say this template
          </div>
          <p className="text-base font-medium italic">
            "{phase.consolidate.verbalRecapTemplate}"
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer rounded-xl border bg-card px-4 py-3 mb-4">
          <input
            type="checkbox"
            checked={checks.verbalRecapDone}
            onChange={() => toggleCheck("verbalRecapDone")}
            className="mt-1 h-5 w-5 accent-primary"
          />
          <div>
            <div className="text-sm font-medium">I said it out loud</div>
            <div className="text-xs text-muted-foreground">Not just in my head.</div>
          </div>
        </label>

        {phase.consolidate.preSleepVisualization && (
          <label className="flex items-start gap-3 cursor-pointer rounded-xl border bg-card px-4 py-3 mb-4">
            <input
              type="checkbox"
              checked={checks.preSleepVisualizationPlanned}
              onChange={() => toggleCheck("preSleepVisualizationPlanned")}
              className="mt-1 h-5 w-5 accent-primary"
            />
            <div>
              <div className="text-sm font-medium">Pre-sleep visualisation planned</div>
              <div className="text-xs text-muted-foreground">2 min before bed tonight extends the consolidation window.</div>
            </div>
          </label>
        )}

        <Button size="lg" className="w-full h-14" onClick={() => advance("tracking")}>
          <ArrowRight className="mr-2 h-5 w-5" /> Log session
        </Button>
      </PageShell>
    );
  }

  // ── TRACKING SHEET ─────────────────────────────────────────────────────────
  if (step === "tracking") {
    const goodPct = totalShots > 0 ? Math.round((goodShots / totalShots) * 100) : 0;
    const gateRequired = phase.gate.requiredGoodPct ?? 0;
    const meetsGate = totalShots > 0 && goodPct >= gateRequired;

    return (
      <PageShell program={program} phase={phase} step={step} {...shellNav}>
        <h2 className="text-2xl font-semibold tracking-tight mb-1">Tracking sheet</h2>
        <p className="text-sm text-muted-foreground mb-5">
          The numbers go on the wall. Honest scoring only.
        </p>

        {/* Good shots / total */}
        <div className="rounded-2xl border bg-card p-4 mb-4">
          <div className="text-sm font-medium mb-3">Shot count</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Good shots</label>
              <input
                type="number"
                min={0}
                max={totalShots || undefined}
                value={goodShots}
                onChange={e => {
                  const g = Math.max(0, parseInt(e.target.value) || 0);
                  setGoodShots(totalShots > 0 ? Math.min(g, totalShots) : g);
                }}
                className="w-full h-12 rounded-xl border bg-background px-4 text-2xl font-semibold tabular-nums text-center"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Total shots</label>
              <input
                type="number"
                min={0}
                value={totalShots}
                onChange={e => {
                  const t = Math.max(0, parseInt(e.target.value) || 0);
                  setTotalShots(t);
                  if (goodShots > t) setGoodShots(t);
                }}
                className="w-full h-12 rounded-xl border bg-background px-4 text-2xl font-semibold tabular-nums text-center"
              />
            </div>
          </div>
          {totalShots > 0 && (
            <div className="mt-3 text-center">
              <span className={`text-2xl font-bold tabular-nums ${meetsGate ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                {goodPct}%
              </span>
              {gateRequired > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  · gate: {gateRequired}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Best feel + one thing next */}
        <div className="rounded-2xl border bg-card p-4 mb-4">
          <label className="text-sm font-medium mb-1 block">Best feel today</label>
          <input
            type="text"
            value={bestFeel}
            onChange={e => setBestFeel(e.target.value)}
            placeholder="e.g. lead heel plant felt obvious"
            className="w-full h-11 rounded-xl border bg-background px-4 text-sm"
          />
        </div>

        <div className="rounded-2xl border bg-card p-4 mb-4">
          <label className="text-sm font-medium mb-1 block">One thing for next session</label>
          <input
            type="text"
            value={oneThingNext}
            onChange={e => setOneThingNext(e.target.value)}
            placeholder="e.g. start backswing slower"
            className="w-full h-11 rounded-xl border bg-background px-4 text-sm"
          />
        </div>

        {/* What was in play — recorded, not scored */}
        {equipmentActive && (
          <div className="rounded-2xl border bg-card p-4 mb-4">
            <div className="text-sm font-medium mb-1">Equipment used</div>
            <div className="text-xs text-muted-foreground">
              {Object.entries(devices)
                .filter(([, on]) => on)
                .map(([d]) => DEVICE_INFO[d as keyof typeof DEVICE_INFO].name)
                .join(" · ")}
            </div>
          </div>
        )}

        {/* Check summary */}
        <div className="rounded-2xl border bg-card p-4 mb-6">
          <div className="text-sm font-medium mb-2">Session checks</div>
          <div className="space-y-1.5 text-xs">
            <CheckRow label="Warm-up done"            checked={checks.warmupDone} />
            <CheckRow label="Cue card read"           checked={checks.cueCardRead} />
            <CheckRow label="Pre-session visualised"  checked={checks.preSessionVisualization} />
            <CheckRow label="Idle rest done"          checked={checks.idleRestDone} />
            <CheckRow label="Verbal recap done"       checked={checks.verbalRecapDone} />
            {phase.consolidate.preSleepVisualization && (
              <CheckRow label="Pre-sleep visualisation planned" checked={checks.preSleepVisualizationPlanned} />
            )}
          </div>
        </div>

        <Button
          size="lg"
          className="w-full h-14"
          onClick={handleSave}
          disabled={saving || saved || totalShots === 0}
        >
          {saved ? "Saved ✓" : saving ? "Saving…" : "Save session"}
        </Button>
        {totalShots === 0 && (
          <p className="text-xs text-center text-muted-foreground mt-2">
            Enter your shot count before saving.
          </p>
        )}
      </PageShell>
    );
  }

  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PageShell({
  program,
  phase,
  step,
  children,
  allowStepPicker,
  onStepChange,
  hasEquipmentStep,
}: {
  program: Program;
  phase: ProgramPhase;
  step: ProgramSessionStep;
  children: React.ReactNode;
  allowStepPicker?: boolean;
  onStepChange?: (step: ProgramSessionStep) => void;
  hasEquipmentStep?: boolean;
}) {
  const stepOrder: ProgramSessionStep[] = [
    "intro",
    ...(hasEquipmentStep ? (["equipment"] as const) : []),
    "warmup",
    "compile-1",
    "micro-rest",
    "compile-2",
    "consolidate",
    "recap",
    "tracking",
  ];
  const phaseNoun = program.phaseNoun ?? "Phase";
  const stepIdx = Math.max(0, stepOrder.indexOf(step));
  const progressPct = Math.round(((stepIdx + 1) / stepOrder.length) * 100);

  const stepLabels: Record<ProgramSessionStep, string> = {
    intro: "Intro",
    equipment: "Equipment",
    warmup: "Warm-up",
    "compile-1": "Compile 1",
    "micro-rest": "Micro-rest",
    "compile-2": "Compile 2",
    consolidate: "Rest",
    recap: "Recap",
    tracking: "Save",
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="border-b sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-primary">
              {phaseNoun} {phase.number}
            </div>
            <div className="text-sm font-medium truncate">{phase.name}</div>
          </div>
          <Link href={`/programs/${program.id}`} className="text-xs text-destructive flex items-center gap-1 shrink-0">
            <X className="h-3.5 w-3.5" /> Exit
          </Link>
        </div>
        {allowStepPicker && onStepChange && (
          <div className="max-w-xl mx-auto px-4 pb-2">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Jump to step
            </label>
            <select
              value={step}
              onChange={e => onStepChange(e.target.value as ProgramSessionStep)}
              className="mt-1 w-full min-h-[44px] rounded-xl border bg-card px-3 text-sm"
            >
              {stepOrder.map(s => (
                <option key={s} value={s}>
                  {stepLabels[s]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="h-0.5 bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6">
        {children}
      </div>
    </div>
  );
}

function CheckRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
      )}
      <span className={checked ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

// Single compile block — drill list + metronome + shot counter notes
function CompileBlock({
  program,
  phase,
  blockNumber,
  blockDuration,
  onContinue,
  continueLabel,
  allowStepPicker,
  onStepChange,
  hasEquipmentStep,
  devices,
  techMetrics,
  techTargets,
  hackMotion,
}: {
  program: Program;
  phase: ProgramPhase;
  blockNumber: 1 | 2;
  blockDuration: string;
  onContinue: () => void;
  continueLabel: string;
  allowStepPicker?: boolean;
  onStepChange?: (step: ProgramSessionStep) => void;
  hasEquipmentStep?: boolean;
  devices: EquipmentSelection;
  techMetrics: TechMetricKey[];
  techTargets: TechTargets;
  hackMotion?: HackMotionSetup;
}) {
  // Drills without a `block` belong to both blocks — the original behaviour
  // every pre-existing program relies on.
  const drills = phase.compileDrills.filter(d => d.block == null || d.block === blockNumber);
  const metronomeDrill = drills.find(d => d.metronomeBPM);
  const gameScores = useProgramGameScores(drills.map(d => d.gameId ?? ""));
  const equipmentActive = anyDeviceActive(devices);

  return (
    <PageShell
      program={program}
      phase={phase}
      step={blockNumber === 1 ? "compile-1" : "compile-2"}
      allowStepPicker={allowStepPicker}
      onStepChange={onStepChange}
      hasEquipmentStep={hasEquipmentStep}
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-semibold tracking-tight">Compile Block {blockNumber}</h2>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {blockDuration}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {blockNumber === 1 ? "Focused, deliberate work. No phone." : "More phase drills + deliberate errors."}
      </p>

      <div className="mb-5">
        <CueCardDisplay card={phase.cueCard} compact />
      </div>

      {metronomeDrill?.metronomeBPM && (
        <div className="mb-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
            Metronome
          </div>
          <MetronomePanel defaultBpm={metronomeDrill.metronomeBPM} />
        </div>
      )}

      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
        Drills
      </div>
      <div className="space-y-2 mb-6">
        {drills.map(d => (
          <div
            key={d.id}
            className={`rounded-xl border px-4 py-3 ${
              d.hasDeliberateError
                ? "border-rose-300/60 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-900/50"
                : d.randomInsert
                ? "border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/50"
                : "bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <div className="font-medium text-sm">{d.name}</div>
              <div className="flex gap-1 shrink-0">
                {d.reps && (
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    {d.reps} reps
                  </span>
                )}
                {d.metronomeBPM && (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded px-1.5 py-0.5">
                    {d.metronomeBPM} BPM
                  </span>
                )}
                {d.hasDeliberateError && (
                  <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 rounded px-1.5 py-0.5">
                    Contrast
                  </span>
                )}
                {d.videoCheck && (
                  <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 rounded px-1.5 py-0.5">
                    Video
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">{d.description}</p>
            {d.equipmentNotes && d.equipmentNotes.some(n => devices[n.device]) && (
              <div className="mt-2 space-y-1">
                {d.equipmentNotes
                  .filter(n => devices[n.device])
                  .map(n => (
                    <div key={n.device} className="flex items-start gap-1.5 text-[11px] leading-snug">
                      <Wrench className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <span>
                        <span className="font-semibold">{DEVICE_INFO[n.device].name}:</span>{" "}
                        <span className="text-muted-foreground">{n.note}</span>
                      </span>
                    </div>
                  ))}
              </div>
            )}
            {d.gameId && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <Link
                  href={`/practice/games/${d.gameId}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                >
                  Play scored game <ArrowRight className="h-3 w-3" />
                </Link>
                <GameTargetChip gameId={d.gameId} summary={gameScores[d.gameId]} />
              </div>
            )}
          </div>
        ))}
      </div>

      {equipmentActive && (
        <div className="mb-5">
          <ModuleTargets
            devices={devices}
            metrics={techMetrics}
            targets={techTargets}
            hackMotion={hackMotion}
            compact
          />
        </div>
      )}

      <Button size="lg" className="w-full h-14" onClick={onContinue}>
        <ArrowRight className="mr-2 h-5 w-5" /> {continueLabel}
      </Button>
    </PageShell>
  );
}

// "Beat your last by 1" progression chip shown next to a scored-game link.
function GameTargetChip({ gameId, summary }: { gameId: string; summary?: GameScoreSummary }) {
  const last = summary?.last;
  if (last === undefined) {
    return (
      <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
        Set your baseline
      </span>
    );
  }
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  const target = nextTargetScore(gameId, last);
  const atCeiling = target <= Math.floor(last);
  return (
    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 rounded-full px-2 py-0.5">
      Last {fmt(last)}
      {atCeiling ? " · top score — hold it" : ` · Target ${fmt(target)}`}
    </span>
  );
}

function MicroRest({
  onContinue,
  program,
  phase,
  allowStepPicker,
  onStepChange,
  hasEquipmentStep,
}: {
  onContinue: () => void;
  program: Program;
  phase: ProgramPhase;
  allowStepPicker?: boolean;
  onStepChange?: (step: ProgramSessionStep) => void;
  hasEquipmentStep?: boolean;
}) {
  const secondsLeft = useCountdown(180, true, () => {});
  const done = secondsLeft === 0;

  return (
    <PageShell program={program} phase={phase} step="micro-rest" allowStepPicker={allowStepPicker} onStepChange={onStepChange} hasEquipmentStep={hasEquipmentStep}>
      <div className="flex flex-col items-center text-center mt-8">
        <Brain className="h-12 w-12 text-blue-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Micro-rest</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-8">
          Eyes closed. Sit. No input. The brain consolidates between blocks.
        </p>

        <div className="text-7xl font-semibold tabular-nums tracking-tighter text-blue-500 mb-2">
          {fmtTime(secondsLeft)}
        </div>
        <p className="text-xs text-muted-foreground mb-10">
          {done ? "Rest complete." : "3 minutes — eyes closed, no phone."}
        </p>

        <Button size="lg" className="w-full h-14 max-w-sm" onClick={onContinue} disabled={!done}>
          <ArrowRight className="mr-2 h-5 w-5" />
          {done ? "Start Compile Block 2" : "Rest in progress…"}
        </Button>
        {!done && (
          <button
            onClick={onContinue}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 mt-3"
          >
            Skip rest
          </button>
        )}
      </div>
    </PageShell>
  );
}

function Consolidate({
  minutes,
  onDone,
  onSkip,
  program,
  phase,
  allowStepPicker,
  onStepChange,
  hasEquipmentStep,
}: {
  minutes: number;
  onDone: () => void;
  onSkip: () => void;
  program: Program;
  phase: ProgramPhase;
  allowStepPicker?: boolean;
  onStepChange?: (step: ProgramSessionStep) => void;
  hasEquipmentStep?: boolean;
}) {
  const secondsLeft = useCountdown(minutes * 60, true);
  const done = secondsLeft === 0;

  return (
    <PageShell program={program} phase={phase} step="consolidate" allowStepPicker={allowStepPicker} onStepChange={onStepChange} hasEquipmentStep={hasEquipmentStep}>
      <div className="flex flex-col items-center text-center mt-6">
        <div className="w-16 h-16 rounded-full bg-violet-500/15 flex items-center justify-center mb-4">
          <Brain className="h-8 w-8 text-violet-500" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Consolidate — idle rest</h2>
        <p className="text-sm text-muted-foreground max-w-xs mb-8">
          {minutes} minutes. No phone. Stare at a wall. This is when learning actually sticks —
          the brain replays the skill 10–20× at high speed.
        </p>

        <div className="text-7xl font-semibold tabular-nums tracking-tighter text-violet-500 mb-2">
          {fmtTime(secondsLeft)}
        </div>
        <p className="text-xs text-muted-foreground mb-10">
          {done ? "Consolidation complete." : "Don't skip this — it's where motor patterns wire in."}
        </p>

        <Button size="lg" className="w-full h-14 max-w-sm" onClick={onDone} disabled={!done}>
          <Mic className="mr-2 h-5 w-5" />
          {done ? "Verbal recap" : "Rest in progress…"}
        </Button>
        {!done && (
          <button
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 mt-3"
          >
            Skip — log "not done"
          </button>
        )}
      </div>
    </PageShell>
  );
}
