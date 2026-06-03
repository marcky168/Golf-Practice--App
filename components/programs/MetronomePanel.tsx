"use client";

import { useEffect, useRef, useState } from "react";
import { Metronome } from "@/lib/programs/metronome";
import { Button } from "@/components/ui/button";
import { Play, Pause, Minus, Plus } from "lucide-react";

interface Props {
  defaultBpm?: number;
  /** Compact mode: smaller footprint for embedding inside drill cards */
  compact?: boolean;
}

export function MetronomePanel({ defaultBpm = 60, compact = false }: Props) {
  const metronomeRef = useRef<Metronome | null>(null);
  const [bpm, setBpm] = useState(defaultBpm);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    metronomeRef.current = new Metronome(defaultBpm);
    return () => {
      metronomeRef.current?.destroy();
      metronomeRef.current = null;
    };
  }, [defaultBpm]);

  function toggle() {
    const m = metronomeRef.current;
    if (!m) return;
    if (playing) {
      m.stop();
      setPlaying(false);
    } else {
      m.setBPM(bpm);
      m.start();
      setPlaying(true);
    }
  }

  function adjustBpm(delta: number) {
    const next = Math.max(30, Math.min(240, bpm + delta));
    setBpm(next);
    metronomeRef.current?.setBPM(next);
  }

  return (
    <div className={`rounded-2xl border bg-card ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <div className="flex items-center gap-3">
        <Button
          onClick={toggle}
          size={compact ? "sm" : "default"}
          variant={playing ? "default" : "outline"}
          className="shrink-0"
          aria-label={playing ? "Stop metronome" : "Start metronome"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <button
          type="button"
          onClick={() => adjustBpm(-2)}
          className="w-8 h-8 rounded-lg border bg-background hover:bg-muted flex items-center justify-center shrink-0"
          aria-label="Decrease BPM"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1 text-center">
          <div className={`tabular-nums font-bold ${compact ? "text-lg" : "text-2xl"} leading-none`}>
            {bpm}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">BPM</div>
        </div>

        <button
          type="button"
          onClick={() => adjustBpm(2)}
          className="w-8 h-8 rounded-lg border bg-background hover:bg-muted flex items-center justify-center shrink-0"
          aria-label="Increase BPM"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
