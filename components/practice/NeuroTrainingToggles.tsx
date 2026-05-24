"use client";

import { Label } from "@/components/ui/label";

type Props = {
  microPauseMode: boolean;
  slowBurn: boolean;
  onMicroPauseChange: (v: boolean) => void;
  onSlowBurnChange: (v: boolean) => void;
};

export function NeuroTrainingToggles({
  microPauseMode,
  slowBurn,
  onMicroPauseChange,
  onSlowBurnChange,
}: Props) {
  return (
    <div>
      <Label className="mb-1 block text-base">Neuro-training</Label>
      <p className="text-xs text-muted-foreground mb-3">
        Huberman-aligned protocols — optional, off by default.
      </p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onMicroPauseChange(!microPauseMode)}
          className={`w-full text-left px-4 py-3 rounded-xl border transition active:scale-[0.985] min-h-[48px] ${
            microPauseMode ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-sm">Audio micro-pauses (20× replay)</div>
            <div
              className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                microPauseMode ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {microPauseMode ? "ON" : "OFF"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            ~25% of practice shots: 10s freeze + spoken replay script while you stand still
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSlowBurnChange(!slowBurn)}
          className={`w-full text-left px-4 py-3 rounded-xl border transition active:scale-[0.985] min-h-[48px] ${
            slowBurn ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30" : "bg-card hover:bg-muted"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-sm">Slow burn mode</div>
            <div
              className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                slowBurn ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {slowBurn ? "ON" : "OFF"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Reminder to swing at ~15% speed — conscious mapping for the motor cortex
          </div>
        </button>
      </div>
    </div>
  );
}

export function neuroFlagsFromState(microPauseMode: boolean, slowBurn: boolean) {
  return {
    ...(microPauseMode ? { microPauseMode: true as const } : {}),
    ...(slowBurn ? { slowBurn: true as const } : {}),
  };
}
