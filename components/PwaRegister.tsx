"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          console.log("[PWA] Service Worker registered");
        })
        .catch((err) => console.warn("[PWA] SW registration failed", err));
    }

    // Capture the install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Detect if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for app installed event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Expose the prompt globally so any component can trigger install
  useEffect(() => {
    if (deferredPrompt) {
      (window as any).__golfInstallPrompt = deferredPrompt;
    }
  }, [deferredPrompt]);

  return null;
}

// Reusable nice Install Button component
export function InstallAppButton() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const check = () => {
      if ((window as any).__golfInstallPrompt) {
        setCanInstall(true);
      }
    };

    // Check immediately and on prompt availability
    check();
    const interval = setInterval(check, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleInstall = async () => {
    const prompt = (window as any).__golfInstallPrompt as BeforeInstallPromptEvent;
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === "accepted") {
      (window as any).__golfInstallPrompt = null;
    }
  };

  if (!canInstall) return null;

  return (
    <button
      onClick={handleInstall}
      className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.985] transition"
    >
      Install App
    </button>
  );
}
