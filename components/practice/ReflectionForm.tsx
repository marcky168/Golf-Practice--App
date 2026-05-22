"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ReflectionFormProps {
  onSave: (data: {
    well: string;
    improve: string;
    energy: number;
    focus: number;
    replayDone: boolean;
    notes: string;
  }) => void;
  onCancel?: () => void;
  defaultValues?: Partial<{
    well: string;
    improve: string;
    energy: number;
    focus: number;
    replayDone: boolean;
    notes: string;
  }>;
  saveLabel?: string;
}

export function ReflectionForm({
  onSave,
  onCancel,
  defaultValues = {},
  saveLabel = "Save Session & Finish",
}: ReflectionFormProps) {
  const [well, setWell] = React.useState(defaultValues.well || "");
  const [improve, setImprove] = React.useState(defaultValues.improve || "");
  const [energy, setEnergy] = React.useState(defaultValues.energy ?? 4);
  const [focus, setFocus] = React.useState(defaultValues.focus ?? 4);
  const [replayDone, setReplayDone] = React.useState(defaultValues.replayDone ?? false);
  const [notes, setNotes] = React.useState(defaultValues.notes || "");

  const handleSubmit = () => {
    onSave({
      well: well.trim(),
      improve: improve.trim(),
      energy,
      focus,
      replayDone,
      notes: notes.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block text-base">What went really well?</Label>
        <textarea
          value={well}
          onChange={(e) => setWell(e.target.value)}
          className="w-full min-h-[90px] rounded-xl border bg-card p-4 text-sm"
          placeholder="Felt the lag and compression on the wedges today..."
        />
      </div>

      <div>
        <Label className="mb-2 block text-base">One thing you will improve next session</Label>
        <textarea
          value={improve}
          onChange={(e) => setImprove(e.target.value)}
          className="w-full min-h-[90px] rounded-xl border bg-card p-4 text-sm"
          placeholder="Stay more centered through the transition"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Energy level</span>
            <span className="font-medium tabular-nums">{energy}/5</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={energy}
            onChange={(e) => setEnergy(+e.target.value)}
            className="w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Focus / Presence</span>
            <span className="font-medium tabular-nums">{focus}/5</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={focus}
            onChange={(e) => setFocus(+e.target.value)}
            className="w-full accent-primary"
          />
        </div>
      </div>

      <label className="flex items-start gap-3 bg-card border rounded-2xl p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={replayDone}
          onChange={(e) => setReplayDone(e.target.checked)}
          className="mt-1 h-5 w-5 accent-primary"
        />
        <div className="text-sm leading-snug">
          I took (or will take) 5 minutes of eyes-closed neural replay after this session
        </div>
      </label>

      <div>
        <Label className="mb-2 block text-base">Any extra notes? (optional)</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Left shoulder felt tight on the last 8 reps..."
          className="w-full min-h-[80px] rounded-xl border bg-card p-4 text-sm"
        />
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button variant="outline" size="lg" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="lg" className="flex-1 h-14 text-lg" onClick={handleSubmit}>
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
