'use client';

import { useState, useEffect, useRef } from 'react';

interface Props {
  seconds: number;
  onComplete: () => void;
}

export function RestBetweenShots({ seconds, onComplete }: Props) {
  const [left, setLeft] = useState(seconds);
  const cbRef = useRef(onComplete);
  cbRef.current = onComplete;

  useEffect(() => {
    if (left <= 0) { cbRef.current(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const progress = ((seconds - left) / seconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background/98 flex flex-col items-center justify-center text-center px-6">
      <div className="text-xs font-semibold tracking-[3px] text-blue-600 mb-3 uppercase">Rest</div>
      <div className="text-[88px] font-bold tabular-nums text-blue-500 leading-none mb-6">{left}</div>
      <div className="w-full max-w-xs h-2 bg-muted rounded-full mb-8">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground mb-8 max-w-xs leading-relaxed">
        Your brain is encoding the last shot. This window is when motor memory forms.
      </p>
      <button
        onClick={() => cbRef.current()}
        className="text-sm text-muted-foreground hover:text-foreground transition underline underline-offset-4"
      >
        Skip rest
      </button>
    </div>
  );
}

// ─── Reusable selector UI (used in each game's setup screen) ─────────────────
export function RestIntervalSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="font-medium text-sm mb-1">Rest Between Shots</div>
      <p className="text-xs text-muted-foreground mb-2">
        Brief rests let your brain consolidate each rep before the next.
      </p>
      <div className="flex flex-wrap gap-2">
        {[0, 15, 30, 45].map(s => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`px-5 py-2 rounded-lg border font-medium text-sm transition ${
              value === s ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
            }`}
          >
            {s === 0 ? 'None' : `${s} sec`}
          </button>
        ))}
      </div>
    </div>
  );
}
