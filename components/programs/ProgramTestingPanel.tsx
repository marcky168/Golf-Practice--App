"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Beaker, RotateCcw, Music } from "lucide-react";
import { toast } from "sonner";
import { deleteProgramSessions } from "@/app/actions";
import type { Program, ProgramSessionStep } from "@/lib/programs/types";

const SESSION_STEPS: { id: ProgramSessionStep; label: string }[] = [
  { id: "intro", label: "Intro + cue card" },
  { id: "equipment", label: "Equipment setup" },
  { id: "warmup", label: "Warm-up" },
  { id: "compile-1", label: "Compile 1 (metronome)" },
  { id: "micro-rest", label: "Micro-rest" },
  { id: "compile-2", label: "Compile 2 (metronome)" },
  { id: "consolidate", label: "Idle rest" },
  { id: "recap", label: "Verbal recap" },
  { id: "tracking", label: "Tracking + save" },
];

type Props = {
  program: Program;
};

export function ProgramTestingPanel({ program }: Props) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [open, setOpen] = useState(false);
  const noun = program.phaseNoun ?? "Phase";

  async function handleReset() {
    if (
      !confirm(
        `Delete all saved ${program.name} sessions? This resets you to Phase 1 with no gate progress. Your other practice history is untouched.`
      )
    ) {
      return;
    }
    setResetting(true);
    const res = await deleteProgramSessions(program.id);
    setResetting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(
      res.deleted === 0
        ? "No program sessions to clear — you're already at a fresh start."
        : `Cleared ${res.deleted} program session${res.deleted === 1 ? "" : "s"}.`
    );
    router.refresh();
  }

  function sessionHref(phaseId: string, step?: ProgramSessionStep) {
    // practice=1 keeps these runs out of progression for every program type.
    // Parallel-module programs treat a bare ?phase= as a normal session start.
    const params = new URLSearchParams({ phase: phaseId, practice: "1" });
    if (step) params.set("step", step);
    return `/programs/${program.id}/session?${params.toString()}`;
  }

  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 mb-2">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 text-left min-h-[44px]"
      >
        <div className="flex items-center gap-2">
          <Beaker className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm text-muted-foreground">Testing &amp; practice tools</span>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Use these to try any phase or jump straight to the metronome without affecting your
            normal &quot;Start Today&apos;s Session&quot; flow. When you&apos;re ready for real
            training, reset progress below and follow the main session button.
          </p>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {`Practice a specific ${noun.toLowerCase()}`}
            </div>
            <div className="flex flex-wrap gap-2">
              {program.phases.map(phase => {
                const hasMetronome = phase.compileDrills.some(d => d.metronomeBPM);
                return (
                  <Link
                    key={phase.id}
                    href={sessionHref(phase.id)}
                    className="min-h-[44px] px-3 py-2 rounded-xl border bg-card text-sm font-medium hover:border-primary/40 transition inline-flex items-center gap-1.5"
                  >
                    {noun} {phase.number}
                    {hasMetronome && <Music className="h-3.5 w-3.5 text-primary opacity-80" />}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Jump to metronome (Compile Block 1)
            </div>
            <div className="flex flex-wrap gap-2">
              {program.phases
                .filter(p => p.compileDrills.some(d => d.metronomeBPM))
                .map(phase => {
                  const bpm = phase.compileDrills.find(d => d.metronomeBPM)?.metronomeBPM;
                  return (
                    <Link
                      key={phase.id}
                      href={sessionHref(phase.id, "compile-1")}
                      className="min-h-[44px] px-3 py-2 rounded-xl border bg-card text-sm hover:border-primary/40 transition"
                    >
                      {noun} {phase.number} · {bpm} BPM
                    </Link>
                  );
                })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {noun}s without a music icon have no metronome drill (e.g. Phase 1.5 setup-only).
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Jump to any session step
            </div>
            <div className="flex flex-wrap gap-2">
              {SESSION_STEPS.map(s => (
                <Link
                  key={s.id}
                  href={sessionHref(program.phases[0].id, s.id)}
                  className="min-h-[40px] px-2.5 py-1.5 rounded-lg border bg-card text-xs hover:border-primary/40"
                >
                  {s.label}
                </Link>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Step links use the first {noun.toLowerCase()} — pick one above first if you need another.
            </p>
          </div>

          <Button
            variant="outline"
            className="w-full min-h-[48px] border-amber-400/60"
            onClick={handleReset}
            disabled={resetting}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {resetting ? "Resetting…" : "Reset program progress (delete saved sessions)"}
          </Button>
        </div>
      )}
    </div>
  );
}
