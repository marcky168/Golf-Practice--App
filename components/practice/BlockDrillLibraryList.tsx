"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Play } from "lucide-react";
import {
  BLOCK_DRILL_LIBRARY,
  getDrillPresetAvailability,
  type BlockDrillPreset,
} from "@/lib/practice/block-drills";
import type { BagEntry } from "@/lib/practice/bag";

function formatPresetMeta(drill: BlockDrillPreset, matchedClubs: string[]): string {
  const clubPart =
    matchedClubs.length > 0
      ? matchedClubs.join(", ")
      : drill.focus.replace("-", " ");
  return `${clubPart} · ${drill.numBlocks}×${drill.ballsPerBlock} · ${drill.cadenceSeconds}s`;
}

interface Props {
  userBag: BagEntry[];
  bagLoading?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Standalone library page — quick start button */
  onStart?: (id: string) => void;
}

export function BlockDrillLibraryList({
  userBag,
  bagLoading = false,
  selectedId,
  onSelect,
  onStart,
}: Props) {
  const selectedDrill = BLOCK_DRILL_LIBRARY.find(d => d.id === selectedId);

  return (
    <div className="space-y-3">
      {bagLoading && (
        <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 px-4 py-3">
          Loading your bag…
        </p>
      )}

      {!bagLoading && userBag.length === 0 && (
        <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 px-4 py-3">
          Add clubs on your Profile to see which drills you can run.
        </p>
      )}

      {selectedDrill && !bagLoading && (
        <div
          className="sticky top-0 z-10 rounded-xl border-2 border-primary bg-primary/10 px-4 py-3 text-sm"
          role="status"
          aria-live="polite"
        >
          <span className="font-semibold text-primary">Selected: </span>
          <span className="text-foreground">{selectedDrill.name}</span>
        </div>
      )}

      {BLOCK_DRILL_LIBRARY.map(drill => {
        const { available, matchedClubs, focusLabel } = getDrillPresetAvailability(
          drill,
          userBag
        );
        const canPick = !bagLoading && userBag.length > 0 && available;
        const selected = selectedId === drill.id;

        return (
          <Card
            key={drill.id}
            role="button"
            tabIndex={canPick ? 0 : -1}
            aria-pressed={selected}
            aria-disabled={!canPick}
            className={`golf-card transition active:scale-[0.985] ${
              canPick ? "cursor-pointer" : "cursor-not-allowed opacity-55"
            } ${
              selected
                ? "border-2 border-primary bg-primary/10 shadow-md ring-2 ring-primary/25"
                : "border border-border hover:border-primary/40"
            }`}
            onClick={() => {
              if (!canPick) return;
              onSelect(drill.id);
            }}
            onKeyDown={e => {
              if (!canPick) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(drill.id);
              }
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-background"
                  }`}
                  aria-hidden
                >
                  {selected ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg leading-snug">{drill.name}</CardTitle>
                    {selected && (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatPresetMeta(drill, matchedClubs)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pl-10">
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-medium text-foreground">Why this helps: </span>
                {drill.whyItHelps}
              </p>

              {canPick && matchedClubs.length > 0 && (
                <p className="text-xs text-muted-foreground mb-3">
                  <span className="font-medium text-foreground">Uses from your bag: </span>
                  {matchedClubs.join(", ")}
                </p>
              )}

              {!bagLoading && userBag.length > 0 && !available && (
                <p className="text-xs text-destructive mb-3">
                  Add a {focusLabel} club on your Profile to run this drill.
                </p>
              )}

              {onStart && (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!canPick}
                  onClick={e => {
                    e.stopPropagation();
                    if (!canPick) return;
                    onSelect(drill.id);
                    onStart(drill.id);
                  }}
                >
                  <Play className="mr-2 h-4 w-4" /> Load &amp; Start
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
