"use client";

import { shapeIcon, trajectoryIcon, type ShapeType, type TrajectoryType } from "./IntentionPicker";

export type CorrectionAnswer = "yes" | "partial" | "no";

export type RepErrorCorrection = {
  startedOnLine?: CorrectionAnswer;
  trajectoryMatch?: CorrectionAnswer;
  hitIntendedShot?: CorrectionAnswer;
  focusCueMatch?: CorrectionAnswer;
  /** Direction of start-line miss — captured when startedOnLine is partial/no */
  startDirection?: "left" | "right";
  /** Distance control miss — short or long of target */
  distanceMiss?: "short" | "long";
  /** Rule 9: on a miss, was the player fully (10/10) committed to the shot? */
  committed?: boolean;
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

function DirectionRow({
  value,
  onChange,
}: {
  value?: "left" | "right";
  onChange: (v: "left" | "right") => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      {(["left", "right"] as const).map(dir => (
        <button
          key={dir}
          type="button"
          onClick={() => onChange(dir)}
          className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition active:scale-[0.985] ${
            value === dir
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/60 hover:bg-muted border-border"
          }`}
        >
          {dir === "left" ? "← Started left" : "Started right →"}
        </button>
      ))}
    </div>
  );
}

function DistanceRow({
  value,
  onChange,
}: {
  value?: "short" | "long";
  onChange: (v: "short" | "long") => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
      <span className="text-[11px] text-muted-foreground shrink-0">Distance:</span>
      {(["short", "long"] as const).map(d => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(value === d ? undefined as any : d)}
          className={`flex-1 rounded-lg border py-1 text-xs font-medium transition active:scale-[0.985] ${
            value === d
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-muted/60 hover:bg-muted border-border"
          }`}
        >
          {d === "short" ? "Short" : "Long"}
        </button>
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined as any)}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function CommitmentRow({
  value,
  onChange,
}: {
  value?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="pt-2 border-t border-border/40 text-left">
      <p className="text-sm font-medium leading-snug mb-2">On that miss — were you 10/10 committed?</p>
      <div className="grid grid-cols-2 gap-2">
        {([["Yes — fully in", true], ["No — I bailed", false]] as const).map(([label, v]) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`min-h-11 rounded-xl border text-sm font-semibold transition active:scale-[0.985] ${
              value === v
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted border-border"
            }`}
          >
            {label}
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

  // Show direction follow-up when startedOnLine is answered as partial/no
  const showDirection =
    hasShapeIntention &&
    (correction.startedOnLine === "no" || correction.startedOnLine === "partial");

  // Show the 10/10-commitment check on any miss (Rule 9).
  const primaryAnswer = hasShapeIntention ? correction.startedOnLine : correction.hitIntendedShot;
  const isMiss = primaryAnswer === "no" || primaryAnswer === "partial";

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
        <div>
          {hasShapeIntention && intention ? (
            <QuestionRow
              prompt={`Start on your ${intention.shape} line?`}
              value={correction.startedOnLine}
              onChange={v => merge({ startedOnLine: v, startDirection: undefined, committed: v === "yes" ? undefined : correction.committed })}
            />
          ) : (
            <QuestionRow
              prompt="Execute the shot you intended?"
              value={correction.hitIntendedShot}
              onChange={v => merge({ hitIntendedShot: v, committed: v === "yes" ? undefined : correction.committed })}
            />
          )}
          {showDirection && (
            <DirectionRow
              value={correction.startDirection}
              onChange={v => merge({ startDirection: v })}
            />
          )}
        </div>

        <QuestionRow
          prompt="Committed to your focus cue?"
          value={correction.focusCueMatch}
          onChange={v => merge({ focusCueMatch: v })}
        />

        <DistanceRow
          value={correction.distanceMiss}
          onChange={v => merge({ distanceMiss: v })}
        />

        {isMiss && (
          <CommitmentRow
            value={correction.committed}
            onChange={v => merge({ committed: v })}
          />
        )}
      </div>

      <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
        Replay one clean rep in your head, then hit when the timer ends.
      </p>
    </div>
  );
}
