"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

const STORAGE_KEY = "golf_os_last_builder_config_v1";

type StoredEntry = {
  title: string;
  savedAt: string;
};

export function RepeatLastSessionCard() {
  const [entry, setEntry] = useState<StoredEntry | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { title?: string; savedAt?: string };
      if (!parsed?.title) return;
      setEntry({
        title: parsed.title,
        savedAt: parsed.savedAt ?? new Date().toISOString(),
      });
    } catch {
      // ignore parse errors
    }
  }, []);

  if (!entry) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">
            Repeat your last session
          </div>
          <div className="font-medium truncate">{entry.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            One tap — same focus, same blocks, fresh reps.
          </div>
        </div>
        <Link href="/practice/builder?repeat=1" className="shrink-0">
          <Button size="lg" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Repeat
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
