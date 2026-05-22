'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SessionConfig, Drill, BlockResult } from '@/lib/practice/types';
import { ReflectionForm } from './ReflectionForm';
import { NeuralReplayTimer } from './NeuralReplayTimer';
import { BlockResultLogger } from './BlockResultLogger';
import {
  celebrateBlockComplete,
  notifyCadenceTick,
  notifyRestComplete,
  unlockPracticeAudio,
} from '@/lib/practice/feedback';
import { useWakeLock } from '@/lib/use-wake-lock';
import { buildSessionTiming } from '@/lib/practice/session-duration';
import { IntentionPicker, type ShapeType, type TrajectoryType, shapeIcon, trajectoryIcon } from './IntentionPicker';
import {
  RestErrorCorrection,
  type RepErrorCorrection,
} from './RestErrorCorrection';
import { markUserHasPracticed } from '@/lib/markHasPracticed';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type Intention = { shape: ShapeType; trajectory: TrajectoryType };

interface SessionRunnerProps {
  config: SessionConfig;
  onComplete: (result: {
    repRecords: Array<{ repNumber: number; rating?: number; drill?: Drill; blockIndex?: number }>;
    blockResults: BlockResult[];
    durationMinutes: number;
    startedAt: string;
    endedAt: string;
    reflection: any;
    notes: string;
  }) => void;
  onExit?: () => void;
  restIntervalSeconds?: number;
  fixedIntention?: Intention;
  drillIntentions?: Intention[];
  initialRepRecords?: RepRecord[];
  initialCurrentIndex?: number;
  /** Resume: wall-clock start of the original session */
  initialSessionStartedAt?: number;
}

interface RepRecord {
  repNumber: number;
  rating?: number;
  drill?: Drill;
  timestamp: number;
  shape?: ShapeType;
  trajectory?: TrajectoryType;
  errorCorrection?: RepErrorCorrection;
}

type Phase = 'running' | 'rest' | 'block-review' | 'reflection' | 'replay';

export function SessionRunner({
  config,
  onComplete,
  onExit,
  restIntervalSeconds = 0,
  fixedIntention,
  drillIntentions,
  initialRepRecords,
  initialCurrentIndex,
  initialSessionStartedAt,
}: SessionRunnerProps) {
  const [phase, setPhase] = useState<Phase>('running');
  const [currentIndex, setCurrentIndex] = useState(initialCurrentIndex ?? 0);
  const [repRecords, setRepRecords] = useState<RepRecord[]>(initialRepRecords ?? []);
  const [isEditingCue, setIsEditingCue] = useState(false);
  const [liveFocusCue, setLiveFocusCue] = useState(config.focusCue || 'Stay present and pick a precise target');

  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);

  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const router = useRouter();
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingResultRef = useRef<any>(null);
  const pendingNavRef = useRef<(() => void) | null>(null);

  const [pendingShape, setPendingShape] = useState<ShapeType | null>(null);
  const [pendingTrajectory, setPendingTrajectory] = useState<TrajectoryType | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [blockResults, setBlockResults] = useState<BlockResult[]>([]);
  const blockResultsRef = useRef<BlockResult[]>([]);
  const [reviewBlockIndex, setReviewBlockIndex] = useState(0);
  const sessionStartedAtRef = useRef(initialSessionStartedAt ?? Date.now());

  const totalSteps = config.drills.length;
  const ballsPerBlock = config.ballsPerBlock ?? 0;
  const numBlocks = config.numBlocks ?? 0;
  const isMultiBlock = ballsPerBlock > 0 && numBlocks > 0;
  const cadenceSeconds = config.cadenceSeconds ?? restIntervalSeconds;
  const currentBlockIndex = isMultiBlock ? Math.floor(currentIndex / ballsPerBlock) : 0;
  const repInBlock = isMultiBlock ? (currentIndex % ballsPerBlock) + 1 : currentIndex + 1;
  const blockProgressPercent = isMultiBlock
    ? Math.round((repInBlock / ballsPerBlock) * 100)
    : Math.round((currentIndex / totalSteps) * 100);
  const currentDrill = config.drills[currentIndex];
  const progressPercent = Math.round((currentIndex / totalSteps) * 100);
  const isCountdown = config.durationMinutes > 0;

  // Session timer setup
  useEffect(() => {
    setTimeLeft(config.durationMinutes * 60);
    setElapsed(0);
    setTimerStartTime(Date.now());
    setTimerActive(true);
  }, [config.durationMinutes]);

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const realElapsed = timerStartTime ? Math.floor((now - timerStartTime) / 1000) : 0;
      if (isCountdown) {
        const remaining = Math.max(0, config.durationMinutes * 60 - realElapsed);
        setTimeLeft(remaining);
        setElapsed(realElapsed);
        if (remaining <= 0) handleTimeUp();
      } else {
        setElapsed(realElapsed);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive, isCountdown, config.durationMinutes, timerStartTime]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && timerActive && timerStartTime) {
        const realElapsed = Math.floor((Date.now() - timerStartTime) / 1000);
        if (isCountdown) {
          const remaining = Math.max(0, config.durationMinutes * 60 - realElapsed);
          setTimeLeft(remaining);
          if (remaining <= 0) handleTimeUp();
        } else {
          setElapsed(realElapsed);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [timerActive, timerStartTime, isCountdown, config.durationMinutes]);

  const stopTimer = () => setTimerActive(false);

  const handleTimeUp = useCallback(() => {
    stopTimer();
    toast.info("Time's up — let's reflect on the session.");
    goToReflection();
  }, []);

  // Keep screen on while actively practicing (off during reflection / replay)
  const keepScreenAwake = phase === 'running' || phase === 'rest' || phase === 'block-review';
  useWakeLock(keepScreenAwake);

  // Rest interval
  function startRest(nextIndex: number) {
    setRestSecondsLeft(cadenceSeconds);
    setPhase('rest');
    restTimerRef.current = setInterval(() => {
      setRestSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(restTimerRef.current!);
          notifyRestComplete();
          setPhase('running');
          setCurrentIndex(nextIndex);
          return 0;
        }
        const next = s - 1;
        // Eyes-off cadence ticks for the last 3 seconds (3, 2, 1 — go tone covers 0)
        if (next > 0 && next <= 3) {
          notifyCadenceTick();
        }
        return next;
      });
    }, 1000);
  }

  function skipRest(nextIndex: number) {
    clearInterval(restTimerRef.current!);
    setRestSecondsLeft(0);
    setPhase('running');
    setCurrentIndex(nextIndex);
  }

  function intentionForRepIndex(index: number): Intention | null {
    const drill = config.drills[index];
    if (!drill || drill.category === 'putting' || drill.category === 'bunker') return null;
    const repInt = perRep?.[index] ?? null;
    return repInt ?? fixedIntention ?? null;
  }

  function updateLastRepErrorCorrection(patch: RepErrorCorrection) {
    setRepRecords(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        {
          ...last,
          errorCorrection: { ...last.errorCorrection, ...patch },
        },
      ];
    });
  }

  useEffect(() => {
    return () => { if (restTimerRef.current) clearInterval(restTimerRef.current); };
  }, []);

  // Intention logic — perRepIntentions (random mode) overrides fixed session intention
  const skipIntention = currentDrill?.category === 'putting' || currentDrill?.category === 'bunker';
  const perRep = config.perRepIntentions ?? drillIntentions;
  const repIntention = perRep?.[currentIndex] ?? null;
  const presetIntention: Intention | null = skipIntention
    ? null
    : repIntention ?? fixedIntention ?? null;
  const isRandomIntentionRep = !skipIntention && repIntention != null;
  const activeShape = skipIntention ? undefined : (presetIntention?.shape ?? pendingShape ?? undefined);
  const activeTrajectory = skipIntention ? undefined : (presetIntention?.trajectory ?? pendingTrajectory ?? undefined);
  const intentionReady = skipIntention || !!presetIntention || (pendingShape !== null && pendingTrajectory !== null);

  function completeCurrentRep(rating?: number) {
    if (!intentionReady) return;
    // First rep tap unlocks audio on iOS Safari so cadence tones play
    unlockPracticeAudio();
    const record: RepRecord = {
      repNumber: currentIndex + 1,
      rating,
      drill: currentDrill,
      timestamp: Date.now(),
      shape: activeShape,
      trajectory: activeTrajectory,
    };
    setRepRecords(prev => [...prev, record]);
    setPendingShape(null);
    setPendingTrajectory(null);
    const next = currentIndex + 1;
    const finishedBlock = isMultiBlock && next > 0 && next % ballsPerBlock === 0;
    const finishedSession = next >= totalSteps;

    if (finishedBlock && isMultiBlock) {
      celebrateBlockComplete();
      setReviewBlockIndex(currentBlockIndex);
      setPhase('block-review');
      return;
    }

    if (finishedSession) {
      stopTimer();
      goToReflection();
    } else if (cadenceSeconds > 0) {
      startRest(next);
    } else {
      setCurrentIndex(next);
    }
  }

  function handleBlockResultSaved(result: BlockResult) {
    const updated = [...blockResultsRef.current, result];
    blockResultsRef.current = updated;
    setBlockResults(updated);
    const next = (result.blockIndex + 1) * ballsPerBlock;
    if (next >= totalSteps) {
      stopTimer();
      goToReflection();
    } else {
      setCurrentIndex(next);
      setPhase('running');
    }
  }

  // Reflection
  function goToReflection() {
    stopTimer();
    markUserHasPracticed();
    setPhase('reflection');
  }

  function handleSaveReflection(data: any) {
    pendingResultRef.current = {
      repRecords: repRecords.map(r => ({
        repNumber: r.repNumber,
        rating: r.rating,
        drill: r.drill,
        blockIndex: isMultiBlock ? Math.floor((r.repNumber - 1) / ballsPerBlock) : undefined,
        shape: r.shape,
        trajectory: r.trajectory,
        errorCorrection: r.errorCorrection,
      })),
      blockResults: blockResultsRef.current,
      reflection: {
        well: data.well,
        improve: data.improve,
        energy: data.energy,
        focus: data.focus,
        replayDone: data.replayDone,
      },
      notes: data.notes,
    };
    setPhase('replay');
  }

  function handleReplayComplete() {
    try { localStorage.removeItem('golf_os_partial'); } catch {}
    if (pendingResultRef.current) {
      const timing = buildSessionTiming(sessionStartedAtRef.current);
      onComplete({ ...pendingResultRef.current, ...timing });
    }
  }

  // Exit logic
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (repRecords.length > 0 && phase === 'running') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [repRecords.length, phase]);

  useEffect(() => {
    if (phase !== 'running' || repRecords.length === 0) return;
    window.history.pushState(null, '', window.location.href);
    const onPop = () => {
      window.history.pushState(null, '', window.location.href);
      stopTimer();
      setShowExitConfirm(true);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [phase, repRecords.length]);

  // Intercept all link clicks (AppHeader, mobile nav, back buttons, etc.)
  // Uses capture phase so it fires before Next.js Link handlers
  useEffect(() => {
    if (phase !== 'running' || repRecords.length === 0) return;
    const intercept = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a[href]');
      if (!anchor) return;
      const href = (anchor as HTMLAnchorElement).getAttribute('href');
      if (!href || href.startsWith('#')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      pendingNavRef.current = () => router.push(href);
      stopTimer();
      setShowExitConfirm(true);
    };
    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, [phase, repRecords.length, router]);

  // Autosave to localStorage after every rep so nothing is lost on navigation
  useEffect(() => {
    if (repRecords.length === 0) return;
    try {
      localStorage.setItem('golf_os_partial', JSON.stringify({
        savedAt: new Date().toISOString(),
        sessionStartedAt: sessionStartedAtRef.current,
        config,
        repRecords,
        currentIndex,
        fixedIntention: fixedIntention ?? null,
        drillIntentions: config.perRepIntentions ?? drillIntentions ?? null,
      }));
    } catch {}
  }, [repRecords]);

  function handleExit() {
    stopTimer();
    if (repRecords.length > 0) {
      setShowExitConfirm(true);
    } else {
      clearInterval(restTimerRef.current!);
      if (onExit) onExit();
      else window.history.back();
    }
  }

  function confirmExit(savePartial: boolean) {
    setShowExitConfirm(false);
    clearInterval(restTimerRef.current!);
    const nav = pendingNavRef.current;
    pendingNavRef.current = null;
    if (savePartial) {
      // Stay in session — go to reflection, ignore the pending navigation
      markUserHasPracticed();
      setPhase('reflection');
    } else {
      stopTimer();
      try { localStorage.removeItem('golf_os_partial'); } catch {}
      if (nav) {
        nav();
      } else if (onExit) {
        onExit();
      } else {
        window.history.back();
      }
    }
  }

  // Display time
  const fmtSecs = (s: number) => ('0' + (s % 60)).slice(-2);
  const fmtMins = (s: number) => String(Math.floor(s / 60));
  const displayTime = isCountdown
    ? (fmtMins(timeLeft) + ':' + fmtSecs(timeLeft))
    : (fmtMins(elapsed) + ':' + fmtSecs(elapsed));

  // ── REFLECTION ──────────────────────────────────────────────────────────────
  if (phase === 'reflection') {
    return (
      <div className='min-h-screen bg-background pb-20 max-w-xl mx-auto px-4 pt-8'>
        <div className='text-center mb-8'>
          <div className='mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4'>
            <CheckCircle2 className='w-6 h-6 text-primary' />
          </div>
          <h1 className='text-3xl font-semibold tracking-tighter'>Session Complete</h1>
          <p className='text-muted-foreground mt-1'>Lock in the learning with a short reflection.</p>
        </div>
        <ReflectionForm onSave={handleSaveReflection} saveLabel='Save + Start Neural Replay' />
      </div>
    );
  }

  // ── REPLAY ──────────────────────────────────────────────────────────────────
  if (phase === 'replay') {
    return <NeuralReplayTimer onComplete={handleReplayComplete} />;
  }

  // ── BLOCK REVIEW ────────────────────────────────────────────────────────────
  if (phase === 'block-review') {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-8">
        <div className="border-b bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="font-medium text-sm text-emerald-700 dark:text-emerald-400">Log block results</div>
          <button onClick={handleExit} className="text-xs text-destructive flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> End Session
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-10">
          <BlockResultLogger
            blockIndex={reviewBlockIndex}
            totalBlocks={numBlocks}
            club={config.club}
            blockReps={
              isMultiBlock
                ? repRecords
                    .filter(r => Math.floor((r.repNumber - 1) / ballsPerBlock) === reviewBlockIndex)
                    .map(r => ({
                      repNumber: r.repNumber,
                      rating: r.rating,
                      drill: r.drill,
                      blockIndex: reviewBlockIndex,
                      shape: r.shape,
                      trajectory: r.trajectory,
                      errorCorrection: r.errorCorrection,
                    }))
                : undefined
            }
            onSave={handleBlockResultSaved}
          />
        </div>
      </div>
    );
  }

  // ── REST (shot cadence timer) ───────────────────────────────────────────────
  if (phase === 'rest') {
    const nextDrill = config.drills[currentIndex + 1];
    const completedDrill = config.drills[currentIndex];
    const completedIntention = intentionForRepIndex(currentIndex);
    const lastRep = repRecords[repRecords.length - 1];
    const isPuttingOrBunker =
      completedDrill?.category === 'putting' || completedDrill?.category === 'bunker';
    const restProgress = cadenceSeconds > 0
      ? ((cadenceSeconds - restSecondsLeft) / cadenceSeconds) * 100
      : 0;
    return (
      <>
        <div className='min-h-screen bg-background flex flex-col pb-8'>
          <div className='border-b bg-blue-50 dark:bg-blue-950/30 px-4 py-3 flex items-center justify-between sticky top-0 z-50'>
            <div className='font-medium text-sm text-blue-700 dark:text-blue-400'>REST — review last shot</div>
            <button onClick={handleExit} className='text-xs text-destructive flex items-center gap-1'>
              <X className='h-3.5 w-3.5' /> End Session
            </button>
          </div>
          <div className='flex-1 flex flex-col items-center px-4 max-w-xl mx-auto w-full pt-6 pb-8'>
            <RestErrorCorrection
              focusCue={liveFocusCue}
              intention={completedIntention}
              isPuttingOrBunker={isPuttingOrBunker}
              club={completedDrill?.club}
              distance={completedDrill?.distance}
              correction={lastRep?.errorCorrection ?? {}}
              onChange={updateLastRepErrorCorrection}
            />

            <div className='text-center w-full'>
              <div className='text-[11px] tracking-[3px] text-muted-foreground mb-2'>NEXT SHOT IN</div>
              <div className='text-[72px] font-semibold tabular-nums leading-none tracking-tighter text-blue-500 mb-3'>
                {restSecondsLeft}
              </div>
              <div className='w-full max-w-xs h-2 bg-muted rounded-full mx-auto mb-4'>
                <div className='h-full bg-blue-500 rounded-full transition-all duration-1000' style={{ width: restProgress + '%' }} />
              </div>
              <p className='text-xs text-muted-foreground max-w-xs mx-auto mb-8 leading-relaxed'>
                Two honest taps, one mental replay — then the tone means go.
              </p>
            </div>
            {nextDrill && (
              <div className='bg-card border rounded-2xl px-6 py-4 mb-8 text-left w-full max-w-sm'>
                <div className='text-xs text-muted-foreground tracking-widest mb-2'>NEXT UP</div>
                <div className='text-xl font-semibold'>{nextDrill.club} — {nextDrill.distance}</div>
                {nextDrill.target && <div className='text-muted-foreground text-sm mt-0.5'>{nextDrill.target}</div>}
                {(() => {
                  const nextIdx = currentIndex + 1;
                  const nextIntent =
                    perRep?.[nextIdx] ??
                    (nextDrill.category !== 'putting' && nextDrill.category !== 'bunker'
                      ? fixedIntention
                      : null);
                  if (!nextIntent) return null;
                  return (
                    <div className='text-sm font-medium text-primary mt-3 pt-3 border-t'>
                      {shapeIcon[nextIntent.shape]} {nextIntent.shape}
                      <span className='text-muted-foreground mx-1'>·</span>
                      {trajectoryIcon[nextIntent.trajectory]} {nextIntent.trajectory}
                    </div>
                  );
                })()}
              </div>
            )}
            <button onClick={() => skipRest(currentIndex + 1)} className='text-sm text-muted-foreground hover:text-foreground transition underline underline-offset-4'>
              Skip rest
            </button>
          </div>
        </div>
        <Dialog open={showExitConfirm} onOpenChange={(open) => { if (!open) setShowExitConfirm(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>End Session?</DialogTitle>
              <DialogDescription>
                {repRecords.length > 0
                  ? ('You have completed ' + repRecords.length + ' of ' + totalSteps + ' shots.')
                  : 'No shots logged yet.'}
              </DialogDescription>
            </DialogHeader>
            <div className='flex flex-col gap-3 pt-4'>
              {repRecords.length > 0 && (
                <Button size='lg' className='w-full' onClick={() => confirmExit(true)}>
                  Save Partial Session + Reflect
                </Button>
              )}
              <Button variant='destructive' size='lg' className='w-full' onClick={() => confirmExit(false)}>
                Discard + Exit
              </Button>
              <Button variant='outline' size='lg' className='w-full' onClick={() => setShowExitConfirm(false)}>
                Keep Practicing
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ── RUNNING ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className='min-h-screen bg-background flex flex-col pb-8'>
        <div className='border-b bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-50'>
          <div className='font-medium text-sm'>{config.title}</div>
          <button onClick={handleExit} className='text-xs text-destructive flex items-center gap-1'>
            <X className='h-3.5 w-3.5' /> End Session
          </button>
        </div>

        <div className='flex-1 flex flex-col items-center justify-center px-4 max-w-xl mx-auto w-full text-center'>
          <div className='mb-6'>
            <div className='text-[11px] tracking-[3px] text-muted-foreground mb-1'>
              {isCountdown ? 'TIME REMAINING' : 'ELAPSED TIME'}
            </div>
            <div className='session-timer text-[86px] leading-none font-semibold tabular-nums tracking-tighter text-primary'>
              {displayTime}
            </div>
          </div>

          <div className='w-full max-w-md mb-8'>
            <div className='uppercase tracking-[2px] text-xs text-muted-foreground mb-2'>CURRENT SHOT</div>
            <div className='text-3xl font-semibold tracking-tighter mb-1'>
              {currentDrill.club} — {currentDrill.distance}
            </div>
            <div className='text-xl text-muted-foreground'>{currentDrill.target || 'Pick a precise target'}</div>
            {currentDrill.instructions && (
              <div className='text-sm text-muted-foreground mt-2 italic'>{currentDrill.instructions}</div>
            )}
          </div>

          <div className='w-full max-w-md mb-10'>
            <div className='text-xs uppercase tracking-widest text-muted-foreground mb-2'>FOCUS CUE</div>
            {!isEditingCue ? (
              <button
                onClick={() => setIsEditingCue(true)}
                className='w-full text-left px-6 py-4 bg-card border rounded-2xl text-xl font-medium active:bg-muted'
              >
                {liveFocusCue}
              </button>
            ) : (
              <div className='flex gap-2'>
                <input
                  value={liveFocusCue}
                  onChange={e => setLiveFocusCue(e.target.value)}
                  className='flex-1 h-14 rounded-xl border bg-card px-5 text-lg'
                  autoFocus
                />
                <Button onClick={() => setIsEditingCue(false)} size='lg'>Done</Button>
              </div>
            )}
            <p className='text-[10px] text-muted-foreground mt-2'>Tap the cue to change it anytime</p>
          </div>

          <div className='w-full max-w-md mb-6'>
            {skipIntention ? (
              <div className='text-xs text-center text-muted-foreground bg-muted/40 rounded-xl py-2 px-4'>
                {currentDrill?.category === 'putting' ? 'Putting — no shape/trajectory needed' : 'Bunker — no shape/trajectory needed'}
              </div>
            ) : presetIntention ? (
              <div className='bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 text-center'>
                <div className='text-xs text-muted-foreground tracking-widest mb-1'>
                  {isRandomIntentionRep ? 'INTENTION — THIS SHOT' : 'INTENTION'}
                </div>
                <div className='text-xl font-semibold text-primary'>
                  {shapeIcon[presetIntention.shape]} {presetIntention.shape}
                  <span className='text-muted-foreground mx-2'>·</span>
                  {trajectoryIcon[presetIntention.trajectory]} {presetIntention.trajectory}
                </div>
                {isRandomIntentionRep && (
                  <p className='text-[10px] text-muted-foreground mt-2'>
                    New random shape &amp; trajectory each shot
                  </p>
                )}
              </div>
            ) : (
              <IntentionPicker
                shape={pendingShape}
                trajectory={pendingTrajectory}
                onShape={setPendingShape}
                onTrajectory={setPendingTrajectory}
              />
            )}
          </div>

          <div className='w-full max-w-sm mb-6'>
            {isMultiBlock ? (
              <>
                <div className='flex justify-between text-sm mb-1 font-medium'>
                  <div>Block {currentBlockIndex + 1} of {numBlocks}</div>
                  <div>Rep {repInBlock} of {ballsPerBlock}</div>
                </div>
                <Progress value={blockProgressPercent} className='h-3 mb-2' />
                <div className='flex justify-between text-xs text-muted-foreground'>
                  <span>Session: {currentIndex + 1}/{totalSteps}</span>
                  <span>{progressPercent}%</span>
                </div>
              </>
            ) : (
              <div className='flex justify-between text-sm mb-2 font-medium'>
                <div>Shot {currentIndex + 1} of {totalSteps}</div>
                <div>{progressPercent}%</div>
              </div>
            )}
            {!isMultiBlock && <Progress value={progressPercent} className='h-3' />}
          </div>

          {cadenceSeconds > 0 && (
            <p className='text-xs text-muted-foreground mb-3'>{cadenceSeconds}s cadence between shots</p>
          )}

          <Button
            size='lg'
            className='h-20 text-2xl w-full max-w-sm font-semibold active:scale-[0.985] disabled:opacity-40'
            onClick={() => completeCurrentRep()}
            disabled={!intentionReady}
          >
            {isMultiBlock ? 'TAP — REP COMPLETE' : 'MARK SHOT COMPLETE'}
          </Button>

          <div className={'mt-6 text-sm transition ' + (intentionReady ? 'text-muted-foreground' : 'text-muted-foreground/40')}>
            Quick rate this shot:
          </div>
          <div className='flex gap-2 mt-2'>
            {[1, 2, 3, 4, 5].map(r => (
              <button
                key={r}
                onClick={() => completeCurrentRep(r)}
                disabled={!intentionReady}
                className='h-12 w-12 rounded-full border text-lg hover:bg-muted active:bg-primary active:text-white transition disabled:opacity-30 disabled:cursor-not-allowed'
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className='text-center text-xs text-muted-foreground pb-4'>
          {repRecords.length} shots logged · Stay deliberate
        </div>
      </div>

      <Dialog open={showExitConfirm} onOpenChange={(open) => { if (!open) setShowExitConfirm(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Session?</DialogTitle>
            <DialogDescription>
              {repRecords.length > 0
                ? ('You have completed ' + repRecords.length + ' of ' + totalSteps + ' shots.')
                : 'No shots logged yet.'}
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-3 pt-4'>
            {repRecords.length > 0 && (
              <Button size='lg' className='w-full' onClick={() => confirmExit(true)}>
                Save Partial Session + Reflect
              </Button>
            )}
            <Button variant='destructive' size='lg' className='w-full' onClick={() => confirmExit(false)}>
              Discard + Exit
            </Button>
            <Button variant='outline' size='lg' className='w-full' onClick={() => setShowExitConfirm(false)}>
              Keep Practicing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
