"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, TrendingUp } from "lucide-react";
import { loadLastMixedConfig } from "@/lib/practice/last-mixed-config";

export function RepeatLastMixedCard() {
  const [entry, setEntry] = useState<{ title: string } | null>(null);

  useEffect(() => {
    const stored = loadLastMixedConfig();
    if (stored?.title) setEntry({ title: stored.title });
  }, []);

  if (!entry) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-primary tracking-widest uppercase mb-1">
              Repeat last mixed session
            </div>
            <div className="font-medium truncate">{entry.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Same warm-up + random mix — fresh shots generated.
            </div>
          </div>
        </div>
        <Link href="/practice/mixed?repeat=1" className="shrink-0">
          <Button size="lg" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Repeat
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
