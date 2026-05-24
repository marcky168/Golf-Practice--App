"use client";

import { useEffect } from "react";
import { MICRO_PAUSE_SECONDS, microPausePromptForSecond } from "@/lib/practice/neural-replay";
import { playMicroPauseStartSound, speakPracticePrompt } from "@/lib/practice/feedback";

export function MicroPauseScreen({ secondsLeft }: { secondsLeft: number }) {
  const prompt = microPausePromptForSecond(secondsLeft);

  useEffect(() => {
    playMicroPauseStartSound();
  }, []);

  useEffect(() => {
    if (prompt) speakPracticePrompt(prompt);
  }, [secondsLeft, prompt]);

  return (
    <div className="min-h-screen bg-[#080f1a] text-white flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-500/15 flex items-center justify-center mb-8 animate-pulse">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-blue-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01.45 1.317C20.25 17.919 18.796 20 16.5 20H7.5c-2.296 0-3.75-2.081-3.75-3.683A2.25 2.25 0 014.2 15m15.6 0H4.2" />
        </svg>
      </div>

      <div className="text-[10px] tracking-[4px] text-blue-400/70 mb-3 uppercase font-semibold">
        Audio neural replay gap
      </div>
      <h2 className="text-3xl font-semibold tracking-tighter mb-3">Freeze &amp; Replay</h2>
      <p className="text-white/55 text-sm mb-6 max-w-xs leading-relaxed">
        Stand still over the ball. Your motor cortex replays the swing at 20× speed — a free rep.
      </p>

      {prompt && (
        <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-4 max-w-sm mb-8">
          <p className="text-sm leading-relaxed text-white/90">{prompt}</p>
        </div>
      )}

      <div className="text-[96px] font-semibold tabular-nums leading-none tracking-tighter mb-3 text-blue-400">
        {secondsLeft}
      </div>

      <div className="w-48 h-1 bg-white/10 rounded-full mb-10">
        <div
          className="h-full bg-blue-400/60 rounded-full transition-all duration-1000"
          style={{ width: `${((MICRO_PAUSE_SECONDS - secondsLeft) / MICRO_PAUSE_SECONDS) * 100}%` }}
        />
      </div>

      <p className="text-[11px] text-white/25 tracking-wide">— Huberman Lab · dopamine gating</p>
    </div>
  );
}
