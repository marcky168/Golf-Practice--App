// =====================================================
// Golf Practice OS — Training Equipment Integration
//
// Models the four training aids the user owns and the objective data they
// produce. Every device is OPTIONAL and toggled per session — the app must
// never require a device the user didn't bring that day.
//
// There is no automatic ingestion: iOS Safari has no Web Bluetooth, so Mevo
// and Hack Motion numbers are entered by hand as a per-block summary.
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

/** Which devices are switched on for a session. */
export type EquipmentSelection = Record<EquipmentDevice, boolean>;

/** Preset bundles the user picks from before a module. */
export type IntegrationLevel = "basic" | "enhanced" | "full-tech";

export interface DeviceInfo {
  id: EquipmentDevice;
  name: string;
  /** One-line primary purpose */
  role: string;
  /** What the app does differently when it's on */
  provides: string;
}

export const DEVICE_INFO: Record<EquipmentDevice, DeviceInfo> = {
  "plane-perfector": {
    id: "plane-perfector",
    name: "Plane Perfector",
    role: "Swing plane / path awareness",
    provides: "Logged as used, plus a feel note. No numbers.",
  },
  "hack-motion": {
    id: "hack-motion",
    name: "Hack Motion",
    role: "Wrist angles at top and impact",
    provides: "Flags wrist positions outside your target range.",
  },
  mevo: {
    id: "mevo",
    name: "Mevo Gen 2 Pro",
    role: "Objective launch monitor data",
    provides: "Face-to-path success and carry distance error, calculated.",
  },
  "face-impact": {
    id: "face-impact",
    name: "Face Impact",
    role: "Strike location (tape / spray)",
    provides: "Strike pattern per block — centre vs heel / toe / high / low.",
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
    description: "Adds Hack Motion and Plane Perfector.",
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

// ── Strike location ───────────────────────────────────────────────────────────

export type StrikeLocation = "center" | "heel" | "toe" | "high" | "low";

export const STRIKE_LOCATIONS: { id: StrikeLocation; label: string }[] = [
  { id: "center", label: "Center" },
  { id: "heel", label: "Heel" },
  { id: "toe", label: "Toe" },
  { id: "high", label: "High" },
  { id: "low", label: "Low" },
];

// ── Metrics ───────────────────────────────────────────────────────────────────

/**
 * Numeric metrics captured once per block as an average. Each belongs to the
 * device that produces it, so the entry form only ever shows fields for
 * devices that are switched on.
 */
export type TechMetricKey =
  // Mevo
  | "faceToPath"
  | "clubPath"
  | "faceAngle"
  | "attackAngle"
  | "smashFactor"
  | "carry"
  | "carryTarget"
  | "totalDistance"
  | "spinRate"
  | "launchAngle"
  | "clubSpeed"
  | "ballSpeed"
  | "landingAngle"
  // Hack Motion
  | "wristAtTop"
  | "wristAtImpact";

export interface TechMetricInfo {
  key: TechMetricKey;
  device: EquipmentDevice;
  label: string;
  unit: string;
  /** Shown under the input to explain sign conventions */
  hint?: string;
  step: number;
  min: number;
  max: number;
  /** Primary metrics render first; the rest sit behind "more fields" */
  primary?: boolean;
}

export const TECH_METRICS: Record<TechMetricKey, TechMetricInfo> = {
  faceToPath: {
    key: "faceToPath",
    device: "mevo",
    label: "Face-to-path",
    unit: "°",
    hint: "Negative = face left of path (draw bias).",
    step: 0.1,
    min: -30,
    max: 30,
    primary: true,
  },
  clubPath: {
    key: "clubPath",
    device: "mevo",
    label: "Club path",
    unit: "°",
    hint: "Negative = out-to-in.",
    step: 0.1,
    min: -30,
    max: 30,
    primary: true,
  },
  faceAngle: {
    key: "faceAngle",
    device: "mevo",
    label: "Face angle",
    unit: "°",
    hint: "Negative = closed to target.",
    step: 0.1,
    min: -30,
    max: 30,
  },
  attackAngle: {
    key: "attackAngle",
    device: "mevo",
    label: "Attack angle",
    unit: "°",
    hint: "Positive = hitting up on it.",
    step: 0.1,
    min: -15,
    max: 15,
    primary: true,
  },
  smashFactor: {
    key: "smashFactor",
    device: "mevo",
    label: "Smash factor",
    unit: "",
    step: 0.01,
    min: 0,
    max: 2,
    primary: true,
  },
  carry: {
    key: "carry",
    device: "mevo",
    label: "Avg carry",
    unit: "yd",
    step: 1,
    min: 0,
    max: 400,
    primary: true,
  },
  carryTarget: {
    key: "carryTarget",
    device: "mevo",
    label: "Target carry",
    unit: "yd",
    hint: "What you were trying to hit — used to score distance error.",
    step: 1,
    min: 0,
    max: 400,
    primary: true,
  },
  totalDistance: {
    key: "totalDistance",
    device: "mevo",
    label: "Avg total",
    unit: "yd",
    step: 1,
    min: 0,
    max: 450,
  },
  spinRate: {
    key: "spinRate",
    device: "mevo",
    label: "Spin rate",
    unit: "rpm",
    step: 50,
    min: 0,
    max: 15000,
  },
  launchAngle: {
    key: "launchAngle",
    device: "mevo",
    label: "Launch angle",
    unit: "°",
    step: 0.1,
    min: 0,
    max: 60,
  },
  clubSpeed: {
    key: "clubSpeed",
    device: "mevo",
    label: "Club speed",
    unit: "mph",
    step: 0.1,
    min: 0,
    max: 160,
  },
  ballSpeed: {
    key: "ballSpeed",
    device: "mevo",
    label: "Ball speed",
    unit: "mph",
    step: 0.1,
    min: 0,
    max: 240,
  },
  landingAngle: {
    key: "landingAngle",
    device: "mevo",
    label: "Landing angle",
    unit: "°",
    step: 0.1,
    min: 0,
    max: 80,
  },
  wristAtTop: {
    key: "wristAtTop",
    device: "hack-motion",
    label: "Wrist at top",
    unit: "°",
    hint: "Positive = extension (cupped). Negative = flexion (bowed).",
    step: 1,
    min: -60,
    max: 60,
    primary: true,
  },
  wristAtImpact: {
    key: "wristAtImpact",
    device: "hack-motion",
    label: "Wrist at impact",
    unit: "°",
    hint: "Positive = extension (cupped). Negative = flexion (bowed).",
    step: 1,
    min: -60,
    max: 60,
    primary: true,
  },
};

// ── Per-block captured data ───────────────────────────────────────────────────

/**
 * One summary entry per compile block. Deliberately a summary rather than a
 * per-shot log: everything is typed by hand at the range, so per-shot entry
 * would cost more attention than the data is worth.
 */
export interface BlockTechData {
  /** 1 or 2 — which compile block this summarises */
  blockNumber: number;
  metrics: Partial<Record<TechMetricKey, number>>;
  /** Dominant strike pattern from the face tape/spray */
  strike?: StrikeLocation;
  /** Centre strikes out of balls hit in the block */
  strikeCenterCount?: number;
  strikeTotalCount?: number;
  /** Plane Perfector is boolean + feel only — it produces no numbers */
  planePerfectorUsed?: boolean;
  planePerfectorNote?: string;
}

export function emptyBlockTech(blockNumber: number): BlockTechData {
  return { blockNumber, metrics: {} };
}

export function blockTechHasData(data: BlockTechData): boolean {
  return (
    Object.values(data.metrics).some(v => typeof v === "number") ||
    data.strike !== undefined ||
    typeof data.strikeCenterCount === "number" ||
    data.planePerfectorUsed === true ||
    Boolean(data.planePerfectorNote?.trim())
  );
}

// ── Targets + evaluation ──────────────────────────────────────────────────────

export interface Range {
  min: number;
  max: number;
}

/**
 * Per-module acceptance windows. When a device is active the app scores the
 * objective number against these instead of relying on the feel rating.
 */
export interface TechTargets {
  /** |face-to-path| must sit inside this many degrees */
  faceToPathWindowDeg?: number;
  /** |carry − target carry| must sit inside this many yards */
  carryErrorYds?: number;
  smashFactorMin?: number;
  /** Attack angle must sit inside this range (driver wants positive, irons negative) */
  attackAngleRange?: Range;
  wristAtTop?: Range;
  wristAtImpact?: Range;
  /** Minimum share of centre strikes, 0–100 */
  centerStrikePctMin?: number;
}

/** Sensible starting windows — a module overrides only what it cares about. */
export const DEFAULT_TECH_TARGETS: TechTargets = {
  faceToPathWindowDeg: 2,
  wristAtTop: { min: -5, max: 15 },
  wristAtImpact: { min: -25, max: 0 },
  centerStrikePctMin: 60,
};

export type TechCheckStatus = "on-target" | "off-target";

export interface TechCheck {
  id: string;
  device: EquipmentDevice;
  label: string;
  status: TechCheckStatus;
  /** Human-readable result, e.g. "1.4° — inside the 2° window" */
  detail: string;
}

function fmt(n: number, digits = 1): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(digits);
}

/**
 * Scores one block's captured data against the module's targets.
 * Only evaluates devices that are switched on and metrics actually entered —
 * a blank field is "not measured", never a failure.
 */
export function evaluateBlockTech(
  data: BlockTechData,
  targets: TechTargets,
  devices: EquipmentSelection
): TechCheck[] {
  const checks: TechCheck[] = [];
  const m = data.metrics;

  if (devices.mevo) {
    if (targets.faceToPathWindowDeg != null && m.faceToPath != null) {
      const window = targets.faceToPathWindowDeg;
      const inside = Math.abs(m.faceToPath) <= window;
      checks.push({
        id: "faceToPath",
        device: "mevo",
        label: "Face-to-path",
        status: inside ? "on-target" : "off-target",
        detail: `${fmt(m.faceToPath)}° — ${inside ? "inside" : "outside"} the ${fmt(window)}° window`,
      });
    }

    if (targets.carryErrorYds != null && m.carry != null && m.carryTarget != null) {
      const error = m.carry - m.carryTarget;
      const inside = Math.abs(error) <= targets.carryErrorYds;
      const sign = error > 0 ? "long" : error < 0 ? "short" : "exact";
      checks.push({
        id: "carryError",
        device: "mevo",
        label: "Carry distance",
        status: inside ? "on-target" : "off-target",
        detail:
          error === 0
            ? `Dead on ${fmt(m.carryTarget, 0)} yd`
            : `${fmt(Math.abs(error), 0)} yd ${sign} of ${fmt(m.carryTarget, 0)} yd (±${targets.carryErrorYds} allowed)`,
      });
    }

    if (targets.smashFactorMin != null && m.smashFactor != null) {
      const ok = m.smashFactor >= targets.smashFactorMin;
      checks.push({
        id: "smashFactor",
        device: "mevo",
        label: "Smash factor",
        status: ok ? "on-target" : "off-target",
        detail: `${fmt(m.smashFactor, 2)} — target ${fmt(targets.smashFactorMin, 2)}+`,
      });
    }

    if (targets.attackAngleRange && m.attackAngle != null) {
      const { min, max } = targets.attackAngleRange;
      const ok = m.attackAngle >= min && m.attackAngle <= max;
      checks.push({
        id: "attackAngle",
        device: "mevo",
        label: "Attack angle",
        status: ok ? "on-target" : "off-target",
        detail: `${fmt(m.attackAngle)}° — target ${fmt(min)}° to ${fmt(max)}°`,
      });
    }
  }

  if (devices["hack-motion"]) {
    const wristChecks: [TechMetricKey, Range | undefined, string][] = [
      ["wristAtTop", targets.wristAtTop, "Wrist at top"],
      ["wristAtImpact", targets.wristAtImpact, "Wrist at impact"],
    ];
    for (const [key, range, label] of wristChecks) {
      const value = m[key];
      if (!range || value == null) continue;
      const ok = value >= range.min && value <= range.max;
      checks.push({
        id: key,
        device: "hack-motion",
        label,
        status: ok ? "on-target" : "off-target",
        detail: `${fmt(value, 0)}° — target ${fmt(range.min, 0)}° to ${fmt(range.max, 0)}°`,
      });
    }
  }

  if (devices["face-impact"] && targets.centerStrikePctMin != null) {
    const { strikeCenterCount: center, strikeTotalCount: total } = data;
    if (center != null && total != null && total > 0) {
      const pct = Math.round((center / total) * 100);
      const ok = pct >= targets.centerStrikePctMin;
      checks.push({
        id: "centerStrike",
        device: "face-impact",
        label: "Centre strikes",
        status: ok ? "on-target" : "off-target",
        detail: `${pct}% (${center}/${total}) — target ${targets.centerStrikePctMin}%+`,
      });
    }
  }

  return checks;
}

/** Rolls every block's checks into one pass/total tally for the session summary. */
export function summariseTechChecks(checks: TechCheck[]): {
  onTarget: number;
  total: number;
  pct: number;
} {
  const total = checks.length;
  const onTarget = checks.filter(c => c.status === "on-target").length;
  return {
    onTarget,
    total,
    pct: total > 0 ? Math.round((onTarget / total) * 100) : 0,
  };
}

/**
 * Section 6: pressure sets can require feel AND tech criteria together.
 * Feel alone passes when no device is on — the objective bar only applies to
 * data that actually exists.
 */
export function pressureSetPassed(
  feelWasGood: boolean,
  checks: TechCheck[]
): boolean {
  if (!feelWasGood) return false;
  return checks.every(c => c.status === "on-target");
}
