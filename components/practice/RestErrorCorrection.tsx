"use client";

import { shapeIcon, trajectoryIcon, type ShapeType, type TrajectoryType } from "./IntentionPicker";

export type CorrectionAnswer = "yes" | "partial" | "no";

export type RepErrorCorrection = {
  startedOnLine?: CorrectionAnswer;
  trajectoryMatch?: CorrectionAnswer;
  hitIntendedShot?: CorrectionAnswer;
  focusCueMatch?: CorrectionAnswer;
};

const ANSWERS: { value: CorrectionAnswer; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "partial", label: "Partial" },
  { value: "no", label: "No" },
];

function QuestionRow({
  prompt,
  value,
  onChange,
}: {
  prompt: string;
  value?: CorrectionAnswer;
  onChange: (v: CorrectionAnswer) => void;
}) {
  return (
    <div className="text-left">
      <p className="text-sm font-medium leading-snug mb-2">{prompt}</p>
      <div className="grid grid-cols-3 gap-2">
        {ANSWERS.map(a => (
          <button
            key={a.value}
            type="button"
            onClick={() => onChange(a.value)}
            className={`min-h-12 rounded-xl border text-sm font-semibold transition active:scale-[0.985] ${
              value === a.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted border-border"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  focusCue: string;
  intention?: { shape: ShapeType; trajectory: TrajectoryType } | null;
  isPuttingOrBunker: boolean;
  club?: string;
  distance?: string;
  drillName?: string;
  correction: RepErrorCorrection;
  onChange: (patch: RepErrorCorrection) => void;
}

/**
 * Two quick checks during rest — tuned for short cadence windows:
 * 1) Execution vs intention (line or shot outcome)
 * 2) Process: focus cue commitment
 * Trajectory is shown in the intention chip but not asked separately (saves time; overall line + cue cover most errors).
 */
export function RestErrorCorrection({
  focusCue,
  intention,
  isPuttingOrBunker,
  club,
  distance,
  drillName,
  correction,
  onChange,
}: Props) {
  const merge = (patch: RepErrorCorrection) => onChange({ ...correction, ...patch });
  const hasShapeIntention = !isPuttingOrBunker && !!intention;

  return (
    <div className="w-full max-w-sm rounded-2xl border bg-card px-4 py-3 text-left mb-5">
      <div className="text-[11px] tracking-[3px] text-violet-600 dark:text-violet-400 mb-1 font-semibold">
        ADAPTATION SIGNALS — NOT FAILURES
      </div>
      <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
        Honest partial/miss taps gate dopamine for learning. Your brain needs these signals to adapt.
      </p>

      {drillName && (
        <p className="text-sm font-semibold text-foreground mb-0.5">{drillName}</p>
      )}
      {(club || distance) && (
        <p className="text-xs text-muted-foreground mb-2">
          {club}
          {distance ? ` · ${distance}` : ""}
        </p>
      )}

      {hasShapeIntention && intention && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-2 py-1.5 mb-2 text-center text-xs font-semibold text-primary">
          {shapeIcon[intention.shape]} {intention.shape}
          <span className="text-muted-foreground font-normal mx-1">·</span>
          {trajectoryIcon[intention.trajectory]} {intention.trajectory}
          <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">
            Cue: {focusCue}
          </span>
        </div>
      )}

      {!hasShapeIntention && (
        <p className="text-xs text-muted-foreground mb-3">
          <span className="font-medium text-foreground">Cue: </span>
          {focusCue}
        </p>
      )}

      <div className="space-y-3">
        {hasShapeIntention && intention ? (
          <QuestionRow
            prompt={`Start on your ${intention.shape} line?`}
            value={correction.startedOnLine}
            onChange={v => merge({ startedOnLine: v })}
          />
        ) : (
          <QuestionRow
            prompt="Execute the shot you intended?"
            value={correction.hitIntendedShot}
            onChange={v => merge({ hitIntendedShot: v })}
          />
        )}
        <QuestionRow
          prompt="Committed to your focus cue?"
          value={correction.focusCueMatch}
          onChange={v => merge({ focusCueMatch: v })}
        />
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Replay one clean rep in your head, then hit when the timer ends.
      </p>
    </div>
  );
}
