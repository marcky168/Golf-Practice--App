"use client";

import { Label } from "@/components/ui/label";
import {
  CHIPPING_GREEN_OPTIONS,
  CHIPPING_LIE_OPTIONS,
} from "@/lib/practice/chipping-scenarios";

export function ChipBlockFocusPicker({
  lieLabel,
  green,
  onLieChange,
  onGreenChange,
  forTransition,
}: {
  lieLabel: string;
  green: string;
  onLieChange: (label: string) => void;
  onGreenChange: (value: string) => void;
  /** When true, copy clarifies these apply to the block half only */
  forTransition?: boolean;
}) {
  return (
    <div className="space-y-4 rounded-xl border bg-card px-4 py-4">
      <div>
        <Label className="mb-1 block text-base">Lie to practice</Label>
        <p className="text-xs text-muted-foreground mb-2">
          {forTransition
            ? "Used for the block half of the session — random half mixes lies."
            : "Same lie for every ball in each block."}
        </p>
        <select
          value={lieLabel}
          onChange={e => onLieChange(e.target.value)}
          className="w-full h-11 rounded-lg border bg-background px-3 text-sm"
        >
          {CHIPPING_LIE_OPTIONS.map(lie => (
            <option key={lie.label} value={lie.label}>
              {lie.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label className="mb-1 block text-base">Green to work with</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Pin position and how much green you have — fixed for each block.
        </p>
        <select
          value={green}
          onChange={e => onGreenChange(e.target.value)}
          className="w-full h-11 rounded-lg border bg-background px-3 text-sm"
        >
          {CHIPPING_GREEN_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
