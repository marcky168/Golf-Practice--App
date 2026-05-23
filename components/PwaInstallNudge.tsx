"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "golf_os_pwa_nudge_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallNudge({ hasCompletedSession }: { hasCompletedSession: boolean }) {
  const [visible, setVisible] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (!hasCompletedSession) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      return;
    }

    const check = () => {
      if ((window as Window & { __golfInstallPrompt?: BeforeInstallPromptEvent }).__golfInstallPrompt) {
        setCanInstall(true);
        setVisible(true);
      }
    };

    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, [hasCompletedSession]);

  if (!visible || !canInstall) return null;

  async function handleInstall() {
    const prompt = (window as Window & { __golfInstallPrompt?: BeforeInstallPromptEvent })
      .__golfInstallPrompt;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  }

  return (
    <Card className="border-accent/40 bg-accent/10">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-accent-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">Add to Home Screen</div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Install for one-tap access at the range — works offline for your session flow.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleInstall}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground p-1 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
