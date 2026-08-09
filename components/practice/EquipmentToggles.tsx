"use client";

import {
  DEVICE_INFO,
  EQUIPMENT_DEVICES,
  INTEGRATION_LEVELS,
  devicesForLevel,
  levelForDevices,
  type EquipmentDevice,
  type EquipmentSelection,
} from "@/lib/practice/equipment";
import type { EquipmentUsage, PhaseEquipmentPlan } from "@/lib/programs/types";

type Props = {
  devices: EquipmentSelection;
  onChange: (devices: EquipmentSelection) => void;
  /** This module's stance on each device — drives ordering and the usage badge */
  plan?: PhaseEquipmentPlan[];
};

const USAGE_STYLES: Record<EquipmentUsage, { label: string; className: string }> = {
  required: {
    label: "Required",
    className: "bg-primary/15 text-primary",
  },
  recommended: {
    label: "Recommended",
    className: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  },
  optional: {
    label: "Optional",
    className: "bg-muted text-muted-foreground",
  },
  "not-needed": {
    label: "Not needed here",
    className: "bg-muted text-muted-foreground",
  },
};

/** Order devices by how much this module leans on them. */
const USAGE_RANK: Record<EquipmentUsage, number> = {
  required: 0,
  recommended: 1,
  optional: 2,
  "not-needed": 3,
};

export function EquipmentToggles({ devices, onChange, plan }: Props) {
  const activeLevel = levelForDevices(devices);

  const ordered: { device: EquipmentDevice; entry?: PhaseEquipmentPlan }[] = EQUIPMENT_DEVICES.map(
    device => ({ device, entry: plan?.find(p => p.device === device) })
  ).sort((a, b) => {
    const ar = a.entry ? USAGE_RANK[a.entry.usage] : 2;
    const br = b.entry ? USAGE_RANK[b.entry.usage] : 2;
    return ar - br;
  });

  function toggle(device: EquipmentDevice) {
    onChange({ ...devices, [device]: !devices[device] });
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-semibold">
        Start from a preset
      </div>
      <div
        role="radiogroup"
        aria-label="Integration level"
        className="grid grid-cols-3 gap-2 mb-5"
      >
        {INTEGRATION_LEVELS.map(level => {
          const selected = activeLevel === level.id;
          return (
            <button
              key={level.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(devicesForLevel(level.id))}
              className={`rounded-xl border px-2 py-3 text-center transition active:scale-[0.985] min-h-[64px] ${
                selected ? "border-primary bg-primary/10" : "bg-card hover:bg-muted"
              }`}
            >
              <div className="text-sm font-semibold">{level.name}</div>
              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {level.id === "basic" ? "No tech" : level.id === "enhanced" ? "Sensors" : "+ Mevo"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Devices with you today
        </div>
        {activeLevel === null && (
          <span className="text-[10px] font-semibold text-muted-foreground">Custom</span>
        )}
      </div>

      <div className="space-y-2">
        {ordered.map(({ device, entry }) => {
          const info = DEVICE_INFO[device];
          const on = devices[device];
          const usage = entry ? USAGE_STYLES[entry.usage] : null;
          return (
            <button
              key={device}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => toggle(device)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition active:scale-[0.985] min-h-[48px] ${
                on ? "border-primary bg-primary/5" : "bg-card hover:bg-muted"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">{info.name}</div>
                <div
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {on ? "ON" : "OFF"}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {entry ? entry.role : info.role}
              </div>
              {usage && (
                <span
                  className={`inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 ${usage.className}`}
                >
                  {usage.label}
                </span>
              )}
              {on && (
                <div className="text-[11px] text-primary mt-1.5 leading-snug">{info.provides}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
