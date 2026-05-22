"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function WelcomeHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const dismissed = localStorage.getItem("golf-practice-os-welcome-dismissed");
    if (!dismissed) {
      // Only show after the user has done at least one session (as a gentle "tour")
      // For brand new users, the big welcome card on the dashboard is sufficient
      const hasPracticed = localStorage.getItem("golf-practice-os-has-practiced");
      if (hasPracticed) {
        const timer = setTimeout(() => setShow(true), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem("golf-practice-os-welcome-dismissed", "true");
    setShow(false);
  };

  if (!show) return null;

  return (
    <Card className="border-primary/30 bg-white mb-6 shadow-sm">
      <CardContent className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold tracking-tight text-lg mb-3">
              Welcome! A few quick tips
            </h3>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Block Practice</strong> — Best when making a technical change or grooving feel.
              </li>
              <li>
                <strong className="text-foreground">Random Practice</strong> — Use this for most sessions. It’s the most effective for on-course performance.
              </li>
              <li>
                <strong className="text-foreground">Games</strong> — Excellent for pressure training and decision-making under stress.
              </li>
              <li>
                <strong className="text-foreground">Calendar</strong> — Planning sessions ahead dramatically increases consistency.
              </li>
            </ul>
          </div>

          <button
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground transition p-1 -mt-1 -mr-1"
            aria-label="Dismiss welcome tips"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            Got it, thanks
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
