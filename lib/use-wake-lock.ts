"use client";

import { useEffect, useRef } from "react";

/**
 * Keep the phone screen awake while `active` is true.
 * Best-effort: silently no-ops on unsupported browsers (iOS Safari < 16.4, etc.).
 * Re-acquires after the page becomes visible again (browsers drop the lock on tab switch).
 */
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("wakeLock" in navigator)) return;

    let cancelled = false;

    const release = () => {
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s) {
        s.release().catch(() => {});
      }
    };

    const acquire = async () => {
      if (!active || cancelled) return;
      if (sentinelRef.current) return;
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      } catch {
        // user denied / battery saver / unsupported context — silent fallback
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && active) {
        void acquire();
      }
    };

    if (active) {
      void acquire();
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      release();
    };
  }, [active]);
}
