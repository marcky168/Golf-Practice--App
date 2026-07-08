import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WeakSpotsPanel } from "@/components/practice/WeakSpotsPanel";
import { ShortGameInsightsPanel } from "@/components/practice/ShortGameInsightsPanel";
import {
  computeWeakSpotsByClub,
  computeWeakSpotsByShape,
  computeWeakSpotsByTrajectory,
  computeWeakSpotsByClubShape,
  computeTimeOfDay,
  computePreSessionCorrelation,
  computeBlockConsistencyTrend,
  computeLeastPracticedClubs,
  computeScenarioClubInsights,
  computeCommitmentStat,
} from "@/lib/practice/insights";
import type { SessionConfig } from "@/lib/practice/types";

export default async function InsightsPage() {
  const supabase = await createClient();
  let sessions: Array<{ started_at: string; config: SessionConfig | null }> = [];
  let bagClubs: string[] = [];

  if (supabase) {
    const [sessionsRes, bagRes] = await Promise.all([
      supabase
        .from("practice_sessions")
        .select("started_at, config")
        .neq("type", "planned")
        .order("started_at", { ascending: false })
        .limit(300),
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return { data: null };
        return supabase
          .from("club_bags")
          .select("clubs")
          .eq("user_id", user.id)
          .maybeSingle();
      }),
    ]);

    sessions = (sessionsRes.data ?? []).map(s => ({
      started_at: s.started_at,
      config: s.config as SessionConfig | null,
    }));

    const rawBag = (bagRes.data as any)?.clubs;
    if (Array.isArray(rawBag)) {
      bagClubs = rawBag.map((e: any) => e.club ?? e).filter(Boolean);
    }
  }

  const allReps = sessions.flatMap(s => s.config?.repRecords ?? []);
  const totalRepsLogged = allReps.filter(r => r.errorCorrection).length;

  const byClub             = computeWeakSpotsByClub(sessions);
  const byShape            = computeWeakSpotsByShape(sessions);
  const byTrajectory       = computeWeakSpotsByTrajectory(sessions);
  const byClubShape        = computeWeakSpotsByClubShape(sessions);
  const timeOfDay          = computeTimeOfDay(sessions);
  const preSessionCorr     = computePreSessionCorrelation(sessions);
  const blockConsistency   = computeBlockConsistencyTrend(sessions);
  const leastPracticed     = computeLeastPracticedClubs(sessions, bagClubs);
  const scenarioInsights   = computeScenarioClubInsights(sessions);
  const commitment         = computeCommitmentStat(sessions);

  return (
    <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <BarChart3 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-semibold tracking-tighter">Shot Insights</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        All-time analysis across your logged sessions — weak spots, trends, and what to practice next.
      </p>

      <WeakSpotsPanel
        byClub={byClub}
        byShape={byShape}
        byTrajectory={byTrajectory}
        byClubShape={byClubShape}
        timeOfDay={timeOfDay}
        preSessionCorr={preSessionCorr}
        blockConsistency={blockConsistency}
        leastPracticed={leastPracticed}
        commitment={commitment}
        totalRepsLogged={totalRepsLogged}
      />

      {/* Short game: club choice by lie type */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight mb-1">Short Game — Club by Lie</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Which clubs actually work best for each lie condition around the green,
          based on your own practice outcomes.
        </p>
        <ShortGameInsightsPanel insights={scenarioInsights} />
      </div>
    </div>
  );
}
