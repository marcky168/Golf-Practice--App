import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WeakSpotsPanel } from "@/components/practice/WeakSpotsPanel";
import {
  computeWeakSpotsByClub,
  computeWeakSpotsByShape,
  computeWeakSpotsByClubShape,
  computeTimeOfDay,
  computePreSessionCorrelation,
} from "@/lib/practice/insights";
import type { SessionConfig } from "@/lib/practice/types";

export default async function InsightsPage() {
  const supabase = await createClient();
  let sessions: Array<{ started_at: string; config: SessionConfig | null }> = [];

  if (supabase) {
    const { data } = await supabase
      .from("practice_sessions")
      .select("started_at, config")
      .neq("type", "planned")
      .order("started_at", { ascending: false })
      .limit(300);

    sessions = (data ?? []).map(s => ({
      started_at: s.started_at,
      config: s.config as SessionConfig | null,
    }));
  }

  const allReps = sessions.flatMap(s => s.config?.repRecords ?? []);
  const totalRepsLogged = allReps.filter(r => r.errorCorrection).length;

  const byClub      = computeWeakSpotsByClub(sessions);
  const byShape     = computeWeakSpotsByShape(sessions);
  const byClubShape = computeWeakSpotsByClubShape(sessions);
  const timeOfDay   = computeTimeOfDay(sessions);
  const preSessionCorr = computePreSessionCorrelation(sessions);

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
        All-time analysis across your logged shots — weak spots by club, shape, and time of day.
      </p>

      <WeakSpotsPanel
        byClub={byClub}
        byShape={byShape}
        byClubShape={byClubShape}
        timeOfDay={timeOfDay}
        preSessionCorr={preSessionCorr}
        totalRepsLogged={totalRepsLogged}
      />
    </div>
  );
}
