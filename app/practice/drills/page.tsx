"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BlockDrillLibraryList } from "@/components/practice/BlockDrillLibraryList";
import { loadBlockDrillPreset } from "@/lib/practice/block-drills";
import { SessionRunner } from "@/components/practice/SessionRunner";
import { SessionRunnerErrorBoundary } from "@/components/practice/SessionRunnerErrorBoundary";
import { getClubBag, savePracticeSession, type ClubEntry } from "@/app/actions";
import { enrichConfigForSave, timingFromCompletion } from "@/lib/practice/session-save";
import { unlockPracticeAudio } from "@/lib/practice/feedback";
import { toast } from "sonner";
import type { SessionConfig } from "@/lib/practice/types";

type Step = "list" | "running" | "complete";

export default function DrillLibraryPage() {
  const [step, setStep] = useState<Step>("list");
  const [userBag, setUserBag] = useState<ClubEntry[]>([]);
  const [bagLoading, setBagLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);

  useEffect(() => {
    getClubBag().then(bag => {
      setUserBag(bag);
      setBagLoading(false);
    });
  }, []);

  function startDrill(id: string) {
    const config = loadBlockDrillPreset(id, userBag);
    if (!config) {
      toast.error("Add the required clubs on your Profile to run this drill.");
      return;
    }
    unlockPracticeAudio();
    setSessionConfig(config);
    setStep("running");
  }

  async function handleComplete(result: any) {
    if (!sessionConfig) return;
    const res = await savePracticeSession({
      type: "block",
      title: sessionConfig.title,
      ...timingFromCompletion(result),
      config: enrichConfigForSave(sessionConfig, {
        repRecords: result.repRecords,
        blockResults: result.blockResults ?? [],
      }),
      reflection: result.reflection,
      notes: result.notes,
    });
    if (res.success) {
      setStep("complete");
      toast.success("Session saved — check History for trends");
    } else {
      toast.error("Failed to save session.");
    }
  }

  // ── RUNNING ──────────────────────────────────────────────────────────────────
  if (step === "running" && sessionConfig) {
    return (
      <SessionRunnerErrorBoundary onSave={handleComplete} onExit={() => setStep("list")}>
        <SessionRunner
          config={sessionConfig}
          onComplete={handleComplete}
          onExit={() => setStep("list")}
          restIntervalSeconds={sessionConfig.cadenceSeconds ?? 0}
        />
      </SessionRunnerErrorBoundary>
    );
  }

  // ── COMPLETE ─────────────────────────────────────────────────────────────────
  if (step === "complete") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tighter mb-3">Session Saved</h1>
          <p className="text-muted-foreground">Block results are in your history trends.</p>
          <div className="flex flex-col gap-3 mt-10">
            <Button
              size="lg"
              onClick={() => {
                setStep("list");
                setSelectedId(null);
                setSessionConfig(null);
              }}
            >
              Run Another Drill
            </Button>
            <Link href="/history">
              <Button variant="outline" size="lg" className="w-full">View Trends</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── LIST ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
      <Link
        href="/practice"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Practice
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tighter">Block Drill Library</h1>
      </div>
      <p className="text-muted-foreground mb-6">
        Pre-built sessions — pick a drill and start immediately.
      </p>

      {userBag.length === 0 && !bagLoading && (
        <p className="text-sm text-muted-foreground rounded-xl border bg-muted/40 px-4 py-3 mb-6">
          Add clubs on your{" "}
          <Link href="/profile" className="underline text-primary">Profile</Link>{" "}
          so drills use your real bag.
        </p>
      )}

      <BlockDrillLibraryList
        userBag={userBag}
        bagLoading={bagLoading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onStart={startDrill}
      />

      <p className="text-center text-xs text-muted-foreground mt-8">
        Want a one-off block? Use{" "}
        <Link href="/practice/block" className="underline">Block Practice</Link>{" "}
        or the{" "}
        <Link href="/practice/builder" className="underline">Practice Builder</Link>.
      </p>
    </div>
  );
}
