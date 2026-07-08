"use client";

import { useEffect } from "react";

const CLASS = "session-immersive";

/**
 * Hides global AppHeader + BottomNav while a practice/program session is running.
 * Uses a documentElement class so layout chrome (outside the runner tree) can react via CSS.
 */
export function useSessionImmersive(active = true) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.classList.add(CLASS);
    return () => {
      root.classList.remove(CLASS);
    };
  }, [active]);
}
