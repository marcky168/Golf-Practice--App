// =====================================================
// Golf Practice OS — Training Equipment Guidance
//
// Models the four training aids the user owns and tells them what to SET UP
// on each one before a module: which Mevo parameters to put on screen and the
// window to hold them in, which HackMotion pattern to select and which tour
// trace to overlay.
//
// Deliberately read-only. The app does not capture launch monitor or wrist
// numbers — those live on the devices' own screens, and re-typing them here
// would cost attention at the range without telling the user anything the
// device isn't already showing.
// =====================================================

export type EquipmentDevice =
  | "plane-perfector"
  | "hack-motion"
  | "mevo"
  | "face-impact";

export const EQUIPMENT_DEVICES: EquipmentDevice[] = [
  "plane-perfector",
  "hack-motion",
  "mevo",
  "face-impact",
];

/** Which devices the user has with them today. Drives which guidance shows. */
export type EquipmentSelection = Record<EquipmentDevice, boolean>;

/** Preset bundles the user picks from before a module. */
export type IntegrationLevel = "basic" | "enhanced" | "full-tech";

export interface DeviceInfo {
  id: EquipmentDevice;
  name: string;
  /** One-line primary purpose */
  role: string;
}

export const DEVICE_INFO: Record<EquipmentDevice, DeviceInfo> = {
  "plane-perfector": {
    id: "plane-perfector",
    name: "Plane Perfector",
    role: "Swing plane / path awareness",
  },
  "hack-motion": {
    id: "hack-motion",
    name: "HackMotion",
    role: "Wrist angles at top and impact",
  },
  mevo: {
    id: "mevo",
    name: "Mevo Gen2",
    role: "Objective launch monitor data",
  },
  "face-impact": {
    id: "face-impact",
    name: "Face Impact",
    role: "Strike location (tape / spray)",
  },
};

export interface IntegrationLevelInfo {
  id: IntegrationLevel;
  name: string;
  description: string;
  devices: EquipmentSelection;
}

const none: EquipmentSelection = {
  "plane-perfector": false,
  "hack-motion": false,
  mevo: false,
  "face-impact": false,
};

/**
 * Presets are a starting point, not a lock — every device stays individually
 * toggleable afterwards. Plane Perfector is left off in Basic because the
 * handoff lists it as optional there.
 */
export const INTEGRATION_LEVELS: IntegrationLevelInfo[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Face Impact + feel. No launch monitor or sensors.",
    devices: { ...none, "face-impact": true },
  },
  {
    id: "enhanced",
    name: "Enhanced",
    description: "Adds HackMotion and Plane Perfector.",
    devices: {
      ...none,
      "face-impact": true,
      "hack-motion": true,
      "plane-perfector": true,
    },
  },
  {
    id: "full-tech",
    name: "Full Tech",
    description: "Everything, including the Mevo.",
    devices: {
      "plane-perfector": true,
      "hack-motion": true,
      mevo: true,
      "face-impact": true,
    },
  },
];

export const NO_EQUIPMENT: EquipmentSelection = { ...none };

export function devicesForLevel(level: IntegrationLevel): EquipmentSelection {
  const found = INTEGRATION_LEVELS.find(l => l.id === level);
  return found ? { ...found.devices } : { ...none };
}

/** The preset that exactly matches a selection, if any (else the user is custom). */
export function levelForDevices(devices: EquipmentSelection): IntegrationLevel | null {
  const match = INTEGRATION_LEVELS.find(l =>
    EQUIPMENT_DEVICES.every(d => l.devices[d] === devices[d])
  );
  return match ? match.id : null;
}

export function anyDeviceActive(devices: EquipmentSelection): boolean {
  return EQUIPMENT_DEVICES.some(d => devices[d]);
}

// ── Mevo parameters ───────────────────────────────────────────────────────────

/**
 * The Mevo readouts a module cares about. Listing them lets the app say
 * "put these on your Mevo screen" instead of leaving the user to guess which
 * of the Pro Package parameters matter today.
 */
export type TechMetricKey =
  | "faceToPath"
  | "clubPath"
  | "faceAngle"
  | "attackAngle"
  | "smashFactor"
  | "lowPoint"
  | "carry"
  | "totalDistance"
  | "spinRate"
  | "launchAngle"
  | "landingAngle";

export interface TechMetricInfo {
  key: TechMetricKey;
  label: string;
  /** Sign convention or reading tip, shown small */
  hint?: string;
}

export const TECH_METRICS: Record<TechMetricKey, TechMetricInfo> = {
  faceToPath:    { key: "faceToPath",    label: "Face to path",   hint: "Negative = face left of path (draw bias)" },
  clubPath:      { key: "clubPath",      label: "Club path",      hint: "Negative = out-to-in" },
  faceAngle:     { key: "faceAngle",     label: "Face to target", hint: "About 85% of your start line" },
  attackAngle:   { key: "attackAngle",   label: "Attack angle",   hint: "Positive = hitting up" },
  smashFactor:   { key: "smashFactor",   label: "Smash factor" },
  lowPoint:      { key: "lowPoint",      label: "Low point",      hint: "Pro Package — inches after the ball" },
  carry:         { key: "carry",         label: "Carry" },
  totalDistance: { key: "totalDistance", label: "Total distance" },
  spinRate:      { key: "spinRate",      label: "Spin rate",      hint: "Fit the metallic stickers or this is modelled" },
  launchAngle:   { key: "launchAngle",   label: "Launch angle" },
  landingAngle:  { key: "landingAngle",  label: "Landing angle",  hint: "Vertical descent angle" },
};

// ── Targets ───────────────────────────────────────────────────────────────────

export interface Range {
  min: number;
  max: number;
}

/**
 * The windows to hold each reading inside for a given module. Purely for
 * display — nothing scores against these, the user reads them off the device.
 */
export interface TechTargets {
  /** |face-to-path| must sit inside this many degrees */
  faceToPathWindowDeg?: number;
  clubPathRange?: Range;
  /** |carry − called number| must sit inside this many yards */
  carryErrorYds?: number;
  smashFactorMin?: number;
  attackAngleRange?: Range;
  lowPointInchesAfterBall?: Range;
  landingAngleRange?: Range;
  spinRateRange?: Range;
  wristAtTop?: Range;
  wristAtImpact?: Range;
  /** Minimum share of centre strikes, 0–100 */
  centerStrikePctMin?: number;
}

/**
 * Sensible starting windows — a module overrides only what it cares about.
 *
 * Wrist ranges follow HackMotion's recommended release (Scott Cowx Pattern A —
 * Stable Lead Wrist Extension): arrive at impact *stable*, not bowed. A heavily
 * flexed impact target is Pattern B (the DJ pattern), which carries a permanent
 * timing cost and is not what this program trains.
 */
export const DEFAULT_TECH_TARGETS: TechTargets = {
  faceToPathWindowDeg: 2,
  wristAtTop: { min: -5, max: 15 },
  wristAtImpact: { min: -5, max: 10 },
  centerStrikePctMin: 60,
};

// ── HackMotion setup ──────────────────────────────────────────────────────────

/**
 * What to select in the HackMotion app before a module. HackMotion is a
 * pattern-matching device, not a hit-this-number device — the training target
 * is a release pattern plus a tour trace to overlay, and the wrist windows are
 * only a cross-check.
 */
export interface HackMotionSetup {
  /** e.g. "Pattern A — Knuckles-down release" */
  pattern: string;
  /** Why this pattern, one line */
  patternNote?: string;
  /** Exact reference-swing names from the app's Data tab, best match first */
  referenceSwings: string[];
  /** A trace in the library that would train the wrong pattern here */
  avoid?: string;
}

// ── Display helpers ───────────────────────────────────────────────────────────

function deg(n: number): string {
  const rounded = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${n > 0 ? "+" : ""}${rounded}°`;
}

function range(r: Range): string {
  return `${deg(r.min)} to ${deg(r.max)}`;
}

export interface TargetLine {
  device: EquipmentDevice;
  label: string;
  /** The window itself, e.g. "within ±2°" */
  window: string;
}

/**
 * Flattens a module's targets into readable lines, skipping any device the
 * user hasn't got with them today.
 */
export function describeTargets(
  targets: TechTargets,
  devices: EquipmentSelection
): TargetLine[] {
  const lines: TargetLine[] = [];

  if (devices.mevo) {
    if (targets.faceToPathWindowDeg != null) {
      lines.push({ device: "mevo", label: "Face to path", window: `within ±${targets.faceToPathWindowDeg}°` });
    }
    if (targets.clubPathRange) {
      lines.push({ device: "mevo", label: "Club path", window: range(targets.clubPathRange) });
    }
    if (targets.attackAngleRange) {
      lines.push({ device: "mevo", label: "Attack angle", window: range(targets.attackAngleRange) });
    }
    if (targets.lowPointInchesAfterBall) {
      const r = targets.lowPointInchesAfterBall;
      lines.push({ device: "mevo", label: "Low point", window: `${r.min}–${r.max} in after the ball` });
    }
    if (targets.smashFactorMin != null) {
      lines.push({ device: "mevo", label: "Smash factor", window: `${targets.smashFactorMin.toFixed(2)} or better` });
    }
    if (targets.carryErrorYds != null) {
      lines.push({ device: "mevo", label: "Carry", window: `within ±${targets.carryErrorYds} yd of the number you called` });
    }
    if (targets.landingAngleRange) {
      const r = targets.landingAngleRange;
      lines.push({ device: "mevo", label: "Landing angle", window: `${r.min}–${r.max}°` });
    }
    if (targets.spinRateRange) {
      const r = targets.spinRateRange;
      lines.push({ device: "mevo", label: "Spin rate", window: `${r.min}–${r.max} rpm` });
    }
  }

  if (devices["hack-motion"]) {
    if (targets.wristAtTop) {
      lines.push({ device: "hack-motion", label: "Wrist at top", window: range(targets.wristAtTop) });
    }
    if (targets.wristAtImpact) {
      lines.push({ device: "hack-motion", label: "Wrist at impact", window: range(targets.wristAtImpact) });
    }
  }

  if (devices["face-impact"] && targets.centerStrikePctMin != null) {
    lines.push({ device: "face-impact", label: "Centre strikes", window: `${targets.centerStrikePctMin}% or better` });
  }

  return lines;
}

/** Mevo readouts to put on screen for this module, in display order. */
export function mevoScreenMetrics(
  metrics: TechMetricKey[],
  devices: EquipmentSelection
): TechMetricInfo[] {
  if (!devices.mevo) return [];
  return metrics.map(k => TECH_METRICS[k]).filter(Boolean);
}
