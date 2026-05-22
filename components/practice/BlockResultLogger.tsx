'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { BlockResult, RepRecordSnapshot } from '@/lib/practice/types';
import { dominantBlockMiss } from '@/lib/practice/trends';

type LogMode = 'consistency' | 'grid';

interface Props {
  blockIndex: number;
  totalBlocks: number;
  club?: string;
  /** Reps belonging to this just-completed block — used to surface a "fix this next" hint */
  blockReps?: RepRecordSnapshot[];
  onSave: (result: BlockResult) => void;
}

const FIX_HINTS: Record<string, string> = {
  startedOnLine:
    "Re-check alignment in your pre-shot routine — pick a closer intermediate target on the next block.",
  trajectoryMatch:
    "Set ball position and shaft lean for the trajectory you want before you step in.",
  hitIntendedShot:
    "Slow your routine; commit to one specific shot before starting your swing.",
  focusCueMatch:
    "Say your cue out loud right before takeaway — keep it to 3 words or fewer.",
};

export function BlockResultLogger({ blockIndex, totalBlocks, club, blockReps, onSave }: Props) {
  const miss = blockReps && blockReps.length > 0 ? dominantBlockMiss(blockReps) : null;
  const [mode, setMode] = useState<LogMode>('consistency');
  const [consistency, setConsistency] = useState<number | null>(null);
  const [grid, setGrid] = useState<boolean[]>(Array(9).fill(false));
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);

  function toggleCell(i: number) {
    setGrid(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  function handleSave() {
    if (mode === 'consistency' && consistency == null) return;
    onSave({
      blockIndex,
      consistency: mode === 'consistency' ? (consistency ?? undefined) : undefined,
      gridHits: mode === 'grid' ? grid : undefined,
      hits: mode === 'grid' ? grid.filter(Boolean).length : hits || undefined,
      misses: mode === 'grid' ? grid.filter(c => !c).length : misses || undefined,
    });
  }

  const gridHits = grid.filter(Boolean).length;

  return (
    <div className="w-full max-w-md mx-auto text-center px-4">
      <div className="text-[11px] tracking-[3px] text-muted-foreground mb-2">BLOCK COMPLETE</div>
      <h2 className="text-2xl font-semibold tracking-tighter mb-1">
        Block {blockIndex + 1} of {totalBlocks}
      </h2>
      {club && <p className="text-muted-foreground text-sm mb-6">{club}</p>}

      {miss && (
        <div className="text-left bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl px-4 py-3 mb-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> FIX THIS NEXT BLOCK
          </div>
          <div className="text-sm font-medium leading-snug mb-1">{miss.label}</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {FIX_HINTS[miss.key] ?? "Make one small adjustment in the next block."}
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-center mb-6">
        <button
          type="button"
          onClick={() => setMode('consistency')}
          className={`px-4 py-2 rounded-lg border text-sm font-medium ${
            mode === 'consistency' ? 'bg-primary text-primary-foreground' : 'bg-card'
          }`}
        >
          Consistency 1–5
        </button>
        <button
          type="button"
          onClick={() => setMode('grid')}
          className={`px-4 py-2 rounded-lg border text-sm font-medium ${
            mode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card'
          }`}
        >
          Target grid
        </button>
      </div>

      {mode === 'consistency' ? (
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-4">How consistent was this block?</p>
          <div className="flex gap-3 justify-center">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setConsistency(n)}
                className={`h-14 w-14 rounded-full border text-xl font-semibold transition ${
                  consistency === n
                    ? 'bg-primary text-primary-foreground border-primary scale-110'
                    : 'bg-card hover:bg-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <p className="text-sm text-muted-foreground mb-4">
            Tap cells you hit in the target zone ({gridHits}/9)
          </p>
          <div className="inline-grid grid-cols-3 gap-2 p-4 bg-muted/30 rounded-2xl border">
            {grid.map((hit, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleCell(i)}
                className={`h-16 w-16 rounded-xl border-2 transition active:scale-95 ${
                  hit
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-card border-border hover:border-primary/40'
                }`}
                aria-label={hit ? 'Hit' : 'Miss'}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Center = pin · Outer = dispersion ring
          </p>
        </div>
      )}

      <Button
        size="lg"
        className="w-full h-14 text-lg"
        disabled={mode === 'consistency' && consistency == null}
        onClick={handleSave}
      >
        {blockIndex + 1 < totalBlocks ? 'Next Block' : 'Finish Session'}
      </Button>
    </div>
  );
}
