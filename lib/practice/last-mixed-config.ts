import type { SkillCategory } from "./types";

export const MIXED_STORAGE_KEY = "golf_os_last_mixed_config_v1";

export type StoredMixedConfig = {
  title: string;
  savedAt: string;
  duration: number;
  selectedAreas: SkillCategory[];
  restInterval: number;
  useYardageFilter: boolean;
  minYards: number;
  maxYards: number;
  microPauseMode?: boolean;
  slowBurn?: boolean;
};

export function saveLastMixedConfig(config: Omit<StoredMixedConfig, "title" | "savedAt"> & { title?: string }) {
  if (typeof window === "undefined") return;
  try {
    const entry: StoredMixedConfig = {
      title: config.title ?? "Mixed Session",
      savedAt: new Date().toISOString(),
      duration: config.duration,
      selectedAreas: config.selectedAreas,
      restInterval: config.restInterval,
      useYardageFilter: config.useYardageFilter,
      minYards: config.minYards,
      maxYards: config.maxYards,
      microPauseMode: config.microPauseMode,
      slowBurn: config.slowBurn,
    };
    localStorage.setItem(MIXED_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export function loadLastMixedConfig(): StoredMixedConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MIXED_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredMixedConfig;
  } catch {
    return null;
  }
}
