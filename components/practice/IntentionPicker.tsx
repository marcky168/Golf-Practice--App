"use client";

export type ShapeType      = "Draw" | "Straight" | "Fade";
export type TrajectoryType = "High" | "Medium"   | "Low";

export const SHAPES:      ShapeType[]      = ["Draw", "Straight", "Fade"];
export const TRAJECTORIES: TrajectoryType[] = ["High", "Medium",  "Low"];

export const shapeIcon:      Record<ShapeType,      string> = { Draw: "↙", Straight: "↓", Fade: "↘" };
export const trajectoryIcon: Record<TrajectoryType, string> = { High: "⬆", Medium:   "➡", Low:  "⬇" };

interface IntentionPickerProps {
  shape:      ShapeType      | null;
  trajectory: TrajectoryType | null;
  onShape:      (s: ShapeType)      => void;
  onTrajectory: (t: TrajectoryType) => void;
}

export function IntentionPicker({ shape, trajectory, onShape, onTrajectory }: IntentionPickerProps) {
  const ready = shape !== null && trajectory !== null;

  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="text-xs font-semibold tracking-widest text-muted-foreground mb-3">
        SET INTENTION BEFORE HITTING
      </div>

      <div className="mb-3">
        <div className="text-xs text-muted-foreground mb-1.5 font-medium">Shot Shape</div>
        <div className="grid grid-cols-3 gap-1.5">
          {SHAPES.map(s => (
            <button
              key={s}
              onClick={() => onShape(s)}
              className={`py-2.5 rounded-xl border text-sm font-semibold transition flex flex-col items-center gap-0.5 ${
                shape === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              }`}
            >
              <span className="text-base">{shapeIcon[s]}</span>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1.5 font-medium">Trajectory</div>
        <div className="grid grid-cols-3 gap-1.5">
          {TRAJECTORIES.map(t => (
            <button
              key={t}
              onClick={() => onTrajectory(t)}
              className={`py-2.5 rounded-xl border text-sm font-semibold transition flex flex-col items-center gap-0.5 ${
                trajectory === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              }`}
            >
              <span className="text-base">{trajectoryIcon[t]}</span>
              {t}
            </button>
          ))}
        </div>
      </div>

      {ready && (
        <div className="mt-3 text-center text-xs font-semibold text-primary bg-primary/8 rounded-xl py-1.5">
          {shape} · {trajectory} — now hit the shot ↓
        </div>
      )}
    </div>
  );
}
