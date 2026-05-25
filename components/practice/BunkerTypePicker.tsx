"use client";

import { Label } from "@/components/ui/label";
import { BUNKER_TYPE_OPTIONS } from "@/lib/practice/bunker-scenarios";
import type { BunkerPracticeType } from "@/lib/practice/types";

export function BunkerTypePicker({
  value,
  onChange,
}: {
  value: BunkerPracticeType;
  onChange: (value: BunkerPracticeType) => void;
}) {
  return (
    <div>
      <Label className="mb-2 block text-base">Bunker type</Label>
      <p className="text-xs text-muted-foreground mb-3">
        Choose one for this session — greenside splash and fairway escape need different
        stations at the range.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {BUNKER_TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-xl border p-4 text-left transition active:scale-[0.985] ${
              value === opt.value
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "bg-card hover:bg-muted border-border"
            }`}
          >
            <div className="font-semibold text-sm">{opt.label}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-snug">{opt.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
