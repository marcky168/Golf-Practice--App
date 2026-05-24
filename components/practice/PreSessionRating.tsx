"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Brain } from "lucide-react";

interface Props {
  onComplete: (energy: number, focus: number) => void;
  onSkip: () => void;
}

function RatingRow({
  label,
  icon,
  value,
  onChange,
  lowLabel,
  highLabel,
  activeClass,
}: {
  label: string;
  icon: React.ReactNode;
  value: number | null;
  onChange: (n: number) => void;
  lowLabel: string;
  highLabel: string;
  activeClass: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-sm font-medium">
        {icon}
        {label}
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 h-12 rounded-xl border text-lg font-semibold transition active:scale-95 ${
              value === n ? activeClass : "bg-card hover:bg-muted"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export function PreSessionRating({ onComplete, onSkip }: Props) {
  const [energy, setEnergy] = useState<number | null>(null);
  const [focus, setFocus]   = useState<number | null>(null);

  const ready = energy !== null && focus !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold tracking-tight mb-2">
            How are you showing up today?
          </h2>
          <p className="text-sm text-muted-foreground">
            Tracks whether performance correlates with how you feel.
            Takes 5 seconds.
          </p>
        </div>

        <div className="space-y-6 mb-8">
          <RatingRow
            label="Energy level"
            icon={<Zap className="h-4 w-4 text-amber-500" />}
            value={energy}
            onChange={setEnergy}
            lowLabel="Drained"
            highLabel="Charged"
            activeClass="bg-amber-500 text-white border-amber-500"
          />
          <RatingRow
            label="Mental focus"
            icon={<Brain className="h-4 w-4 text-primary" />}
            value={focus}
            onChange={setFocus}
            lowLabel="Scattered"
            highLabel="Locked in"
            activeClass="bg-primary text-primary-foreground border-primary"
          />
        </div>

        <Button
          size="lg"
          className="w-full h-14 text-lg mb-3"
          disabled={!ready}
          onClick={() => ready && onComplete(energy!, focus!)}
        >
          Let's Go
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 text-center"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
