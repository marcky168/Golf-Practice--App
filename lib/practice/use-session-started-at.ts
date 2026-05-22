"use client";

import { useEffect, useRef } from "react";

/** Records wall-clock start when `active` first becomes true (full game/session). */
export function useSessionStartedAt(active: boolean) {
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (active && startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
  }, [active]);

  return startedAtRef;
}
