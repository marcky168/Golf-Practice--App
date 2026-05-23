"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "golf_os_range_mode";

type RangeModeContextValue = {
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  toggle: () => void;
};

const RangeModeContext = createContext<RangeModeContextValue | null>(null);

export function RangeModeProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setEnabledState(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (enabled) root.classList.add("range-mode");
    else root.classList.remove("range-mode");
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [enabled, ready]);

  const setEnabled = useCallback((on: boolean) => setEnabledState(on), []);
  const toggle = useCallback(() => setEnabledState(v => !v), []);

  return (
    <RangeModeContext.Provider value={{ enabled, setEnabled, toggle }}>
      {children}
    </RangeModeContext.Provider>
  );
}

export function useRangeMode() {
  const ctx = useContext(RangeModeContext);
  if (!ctx) throw new Error("useRangeMode must be used within RangeModeProvider");
  return ctx;
}
