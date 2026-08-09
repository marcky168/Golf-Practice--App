"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  DEVICE_INFO,
  STRIKE_LOCATIONS,
  TECH_METRICS,
  evaluateBlockTech,
  type BlockTechData,
  type EquipmentSelection,
  type StrikeLocation,
  type TechMetricKey,
  type TechTargets,
} from "@/lib/practice/equipment";

type Props = {
  data: BlockTechData;
  onChange: (data: BlockTechData) => void;
  devices: EquipmentSelection;
  /** Metric keys this module tracks — order is preserved */
  metrics: TechMetricKey[];
  targets: TechTargets;
};

/**
 * One summary card per compile block. Only renders fields for devices that are
 * switched on, so a Basic-mode session shows just the strike picker.
 */
export function BlockTechEntry({ data, onChange, devices, metrics, targets }: Props) {
  const [showMore, setShowMore] = useState(false);

  const visible = metrics.filter(k => devices[TECH_METRICS[k].device]);
  const primary = visible.filter(k => TECH_METRICS[k].primary);
  const secondary = visible.filter(k => !TECH_METRICS[k].primary);

  const checks = evaluateBlockTech(data, targets, devices);

  function setMetric(key: TechMetricKey, value: number | undefined) {
    const next = { ...data.metrics };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onChange({ ...data, metrics: next });
  }

  const showStrike = devices["face-impact"];
  const showPlanePerfector = devices["plane-perfector"];

  if (visible.length === 0 && !showStrike && !showPlanePerfector) return null;

  return (
    <div className="rounded-2xl border bg-card p-4 mb-5">
      <div className="text-sm font-medium mb-1">Block {data.blockNumber} numbers</div>
      <p className="text-xs text-muted-foreground mb-3 leading-snug">
        Averages for the whole block — fill in what you have, leave the rest blank.
      </p>

      {primary.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {primary.map(key => (
            <MetricField
              key={key}
              metricKey={key}
              value={data.metrics[key]}
              onChange={v => setMetric(key, v)}
            />
          ))}
        </div>
      )}

      {secondary.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowMore(s => !s)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground min-h-[36px]"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showMore ? "rotate-180" : ""}`}
            />
            {showMore ? "Fewer fields" : `${secondary.length} more fields`}
          </button>
          {showMore && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              {secondary.map(key => (
                <MetricField
                  key={key}
                  metricKey={key}
                  value={data.metrics[key]}
                  onChange={v => setMetric(key, v)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {showStrike && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs font-medium mb-2">
            Strike pattern
            <span className="text-muted-foreground font-normal"> · {DEVICE_INFO["face-impact"].name}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {STRIKE_LOCATIONS.map(loc => {
              const selected = data.strike === loc.id;
              return (
                <button
                  key={loc.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    onChange({ ...data, strike: selected ? undefined : (loc.id as StrikeLocation) })
                  }
                  className={`min-h-[40px] px-3 rounded-xl border text-xs font-medium transition ${
                    selected ? "border-primary bg-primary/10 text-primary" : "bg-background hover:bg-muted"
                  }`}
                >
                  {loc.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <CountField
              label="Centre strikes"
              value={data.strikeCenterCount}
              max={data.strikeTotalCount}
              onChange={v => onChange({ ...data, strikeCenterCount: v })}
            />
            <CountField
              label="Balls hit"
              value={data.strikeTotalCount}
              onChange={v =>
                onChange({
                  ...data,
                  strikeTotalCount: v,
                  strikeCenterCount:
                    v != null && data.strikeCenterCount != null && data.strikeCenterCount > v
                      ? v
                      : data.strikeCenterCount,
                })
              }
            />
          </div>
        </div>
      )}

      {showPlanePerfector && (
        <div className="mt-4 pt-4 border-t">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.planePerfectorUsed ?? false}
              onChange={e => onChange({ ...data, planePerfectorUsed: e.target.checked })}
              className="mt-0.5 h-5 w-5 accent-primary"
            />
            <div>
              <div className="text-xs font-medium">Used the Plane Perfector in this block</div>
              <div className="text-[11px] text-muted-foreground">No numbers — just used or not, plus the feel.</div>
            </div>
          </label>
          {data.planePerfectorUsed && (
            <input
              type="text"
              value={data.planePerfectorNote ?? ""}
              onChange={e => onChange({ ...data, planePerfectorNote: e.target.value })}
              placeholder="Feel note, e.g. shallowing felt exaggerated"
              className="mt-2 w-full h-11 rounded-xl border bg-background px-3 text-sm"
            />
          )}
        </div>
      )}

      {checks.length > 0 && (
        <div className="mt-4 pt-4 border-t space-y-1.5">
          {checks.map(c => (
            <div key={c.id} className="flex items-start gap-2 text-xs">
              {c.status === "on-target" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">
                <span className="font-medium">{c.label}:</span>{" "}
                <span className="text-muted-foreground">{c.detail}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A single metric input. Signed metrics get an explicit +/− toggle because the
 * iOS decimal keypad has no minus key — the input itself only ever holds the
 * magnitude.
 */
function MetricField({
  metricKey,
  value,
  onChange,
}: {
  metricKey: TechMetricKey;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const info = TECH_METRICS[metricKey];
  const signed = info.min < 0;
  // An empty field has nowhere to carry a sign, so the toggle is armed here
  // until a number is typed. Once there is a value, the value is the truth.
  const [armedNegative, setArmedNegative] = useState(false);
  const showNegative = value == null ? armedNegative : value < 0;
  const limit = Math.max(Math.abs(info.min), Math.abs(info.max));

  function handleChange(raw: string) {
    if (raw.trim() === "") {
      onChange(undefined);
      return;
    }
    const magnitude = Math.abs(parseFloat(raw));
    if (Number.isNaN(magnitude)) return;
    const clamped = Math.min(magnitude, limit);
    onChange(showNegative ? -clamped : clamped);
  }

  function flipSign() {
    setArmedNegative(!showNegative);
    if (value != null) onChange(-value);
  }

  return (
    <div>
      <label className="text-[11px] text-muted-foreground mb-1 block leading-tight">
        {info.label}
        {info.unit && <span className="opacity-70"> ({info.unit})</span>}
      </label>
      <div className="flex gap-1.5">
        {signed && (
          <button
            type="button"
            aria-label={`Toggle sign for ${info.label}`}
            aria-pressed={showNegative}
            onClick={flipSign}
            className={`h-12 w-11 shrink-0 rounded-xl border text-lg font-semibold transition ${
              showNegative
                ? "border-primary bg-primary/10 text-primary"
                : "bg-background text-muted-foreground"
            }`}
          >
            {showNegative ? "−" : "+"}
          </button>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={value == null ? "" : String(Math.abs(value))}
          onChange={e => handleChange(e.target.value)}
          placeholder="—"
          className="w-full h-12 rounded-xl border bg-background px-3 text-lg font-semibold tabular-nums text-center"
        />
      </div>
      {info.hint && <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{info.hint}</p>}
    </div>
  );
}

function CountField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number | undefined;
  max?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div>
      <label className="text-[11px] text-muted-foreground mb-1 block">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value == null ? "" : String(value)}
        onChange={e => {
          const raw = e.target.value.trim();
          if (raw === "") {
            onChange(undefined);
            return;
          }
          const parsed = parseInt(raw, 10);
          if (Number.isNaN(parsed) || parsed < 0) return;
          onChange(max != null ? Math.min(parsed, max) : parsed);
        }}
        placeholder="—"
        className="w-full h-12 rounded-xl border bg-background px-3 text-lg font-semibold tabular-nums text-center"
      />
    </div>
  );
}
