import { Gauge, Target, Layers } from "lucide-react";
import {
  DEVICE_INFO,
  describeTargets,
  mevoScreenMetrics,
  type EquipmentSelection,
  type TechTargets,
} from "@/lib/practice/equipment";
import type { HackMotionSetup } from "@/lib/practice/equipment";
import type { TechMetricKey } from "@/lib/practice/equipment";

type Props = {
  devices: EquipmentSelection;
  metrics: TechMetricKey[];
  targets: TechTargets;
  hackMotion?: HackMotionSetup;
  /** Compact form drops the setup instructions and shows windows only */
  compact?: boolean;
};

/**
 * Read-only "set your devices up like this" card. The app never asks for these
 * numbers back — they live on the devices' own screens.
 */
export function ModuleTargets({ devices, metrics, targets, hackMotion, compact }: Props) {
  const screenMetrics = mevoScreenMetrics(metrics, devices);
  const lines = describeTargets(targets, devices);
  const showHackMotion = devices["hack-motion"] && hackMotion;

  if (screenMetrics.length === 0 && lines.length === 0 && !showHackMotion) return null;

  return (
    <div className="space-y-3">
      {/* Mevo — what to put on screen */}
      {!compact && screenMetrics.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Gauge className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">Set your {DEVICE_INFO.mevo.name} to show</div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {screenMetrics.map(m => (
              <span
                key={m.key}
                className="text-xs font-medium rounded-full bg-primary/10 text-primary px-2.5 py-1"
              >
                {m.label}
              </span>
            ))}
          </div>
          <ul className="mt-3 space-y-1">
            {screenMetrics
              .filter(m => m.hint)
              .map(m => (
                <li key={m.key} className="text-[11px] text-muted-foreground leading-snug">
                  <span className="font-medium text-foreground">{m.label}:</span> {m.hint}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* HackMotion — which pattern and which trace */}
      {showHackMotion && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">Select in {DEVICE_INFO["hack-motion"].name}</div>
          </div>
          <div className="mt-2 rounded-xl bg-primary/10 px-3 py-2">
            <div className="text-sm font-semibold text-primary">{hackMotion.pattern}</div>
            {hackMotion.patternNote && !compact && (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                {hackMotion.patternNote}
              </p>
            )}
          </div>
          {!compact && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-3 mb-1.5">
                Overlay one of these
              </div>
              <ul className="space-y-1">
                {hackMotion.referenceSwings.map(name => (
                  <li key={name} className="text-xs leading-snug flex gap-1.5">
                    <span className="text-muted-foreground">·</span>
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
              {hackMotion.avoid && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 leading-snug">
                  Skip: {hackMotion.avoid}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* The windows themselves */}
      {lines.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <div className="text-sm font-medium">Hold these windows</div>
          </div>
          <div className="divide-y">
            {lines.map(l => (
              <div
                key={`${l.device}-${l.label}`}
                className="flex items-baseline justify-between gap-3 py-1.5"
              >
                <span className="text-xs text-muted-foreground">{l.label}</span>
                <span className="text-sm font-semibold tabular-nums text-right">{l.window}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2.5 leading-snug">
            Read these off the device. Nothing to type in — the app only tracks your good-shot
            count.
          </p>
        </div>
      )}
    </div>
  );
}
