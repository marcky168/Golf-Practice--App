"use client";

import { useState, useEffect, useRef } from "react";

const PHASES = [
  {
    after: 0,
    prompt: "Close your eyes. Replay your 3 best shots — feel the contact, see the ball flight.",
  },
  {
    after: 90,
    prompt: "Now replay your pre-shot routine. Feel the rhythm, the commitment, the stillness before impact.",
  },
  {
    after: 180,
    prompt: "Visualize using these shots on the course. Pick a real hole. Where does the ball land?",
  },
  {
    after: 270,
    prompt: "Almost done. Take one slow deep breath. Feel the session settling in.",
  },
];

const TOTAL = 300; // 5 minutes

interface NeuralReplayTimerProps {
  onComplete: () => void;
}

export function NeuralReplayTimer({ onComplete }: NeuralReplayTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const finishedRef = useRef(false);
  onCompleteRef.current = onComplete;

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    onCompleteRef.current();
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, []);

  // Fire onComplete after render when countdown hits 0 — never inside setState updater
  useEffect(() => {
    if (secondsLeft > 0) return;
    finish();
  }, [secondsLeft]);

  const elapsed = TOTAL - secondsLeft;
  const currentPhase = [...PHASES].reverse().find(p => elapsed >= p.after) ?? PHASES[0];
  const progress = (elapsed / TOTAL) * 100;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="min-h-screen bg-[#071a0e] text-white flex flex-col items-center justify-center px-6 text-center pb-12">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-8">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 text-white/70">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01.45 1.317C20.25 17.919 18.796 20 16.5 20H7.5c-2.296 0-3.75-2.081-3.75-3.683A2.25 2.25 0 014.2 15m15.6 0H4.2" />
        </svg>
      </div>

      <h1 className="text-3xl font-semibold tracking-tighter mb-2">Neural Replay</h1>
      <p className="text-white/50 text-sm mb-10 max-w-xs leading-relaxed">
        Your brain is consolidating motor patterns right now. This window closes in 5 minutes.
      </p>

      {/* Countdown */}
      <div className="text-[86px] font-semibold tabular-nums leading-none tracking-tighter mb-4">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs h-1 bg-white/15 rounded-full mb-10">
        <div
          className="h-full bg-white/50 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Phase prompt */}
      <div className="bg-white/8 border border-white/10 rounded-2xl p-5 max-w-sm mb-8">
        <p className="text-sm leading-relaxed text-white/80">{currentPhase.prompt}</p>
      </div>

      <p className="text-xs text-white/25 mb-8">— Huberman Lab Motor Learning Protocol</p>

      <button
        type="button"
        onClick={finish}
        className="text-sm text-white/30 hover:text-white/60 transition underline underline-offset-4"
      >
        Skip replay
      </button>
    </div>
  );
}
