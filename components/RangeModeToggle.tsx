"use client";

import { Sun } from "lucide-react";
import { useRangeMode } from "@/components/RangeModeProvider";

export function RangeModeToggle() {
  const { enabled, toggle } = useRangeMode();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={toggle}
      className={
        "w-full flex items-center justify-between gap-4 rounded-2xl border px-4 py-4 text-left active:scale-[0.99] transition " +
        (enabled
          ? "bg-primary/10 border-primary/40 shadow-sm"
          : "bg-card")
      }
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 " +
            (enabled ? "bg-accent/25" : "bg-amber-100 dark:bg-amber-950")
          }
        >
          <Sun className={`h-5 w-5 ${enabled ? "text-accent" : "text-amber-600"}`} />
        </div>
        <div>
          <div className="font-medium">Range mode (bright sun)</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Higher contrast for outdoor readability at the range.
          </div>
        </div>
      </div>
      <div
        className={`h-8 w-14 rounded-full shrink-0 transition-colors ${
          enabled ? "bg-primary" : "bg-muted"
        }`}
      >
        <div
          className={`h-7 w-7 rounded-full bg-white shadow-sm mt-0.5 transition-transform ${
            enabled ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
