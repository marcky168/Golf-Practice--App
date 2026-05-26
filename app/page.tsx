import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Clock, Flame, TrendingUp, BarChart3, ChevronRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import { format, subMonths } from "date-fns";
import { getUserSessions } from "@/app/actions";
import { computeWeakSpotsByClubShape } from "@/lib/practice/insights";
import type { SessionConfig } from "@/lib/practice/types";
import { getLoggedPracticeMinutes, getSessionDurationMinutes } from "@/lib/practice/session-duration";
import { WelcomeHint } from "@/components/WelcomeHint";
import { PartialSessionBanner } from "@/components/PartialSessionBanner";
import { RepeatLastSessionCard } from "@/components/RepeatLastSessionCard";
import { DashboardHero } from "@/components/DashboardHero";
import { PwaInstallNudge } from "@/components/PwaInstallNudge";

// Helper: Calculate current practice streak
function calculateCurrentStreak(sessions: any[]): number {
  const practiceSessions = sessions.filter(s => s.type !== "planned");
  if (!practiceSessions.length) return 0;

  // Get unique practice dates (YYYY-MM-DD), sorted newest first
  const uniqueDates = Array.from(new Set(
    practiceSessions.map(s => new Date(s.started_at).toISOString().split("T")[0])
  )).sort().reverse();

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const dateStr of uniqueDates) {
    const sessionDate = new Date(dateStr);
    const diffDays = Math.floor(
      (currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === streak) {
      streak++;
      currentDate = sessionDate;
    } else if (diffDays > streak) {
      break;
    }
  }

  return streak;
}

export default async function GolfPracticeOSDashboard() {
  const { getAuthUser } = await import("@/lib/supabase/server");
  const user = await getAuthUser();
  const sessions = user ? await getUserSessions(50) : [];

  // === Compute real stats ===
  const now = new Date();
  const oneMonthAgo = subMonths(now, 1);

  const completedSessions = sessions.filter(s => s.type !== "planned");
  const sessionsThisMonth = completedSessions.filter(s =>
    new Date(s.started_at) >= oneMonthAgo
  );

  const totalMinutes = getLoggedPracticeMinutes(sessions);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Current streak calculation
  const streak = calculateCurrentStreak(sessions);

  // Most common session title (specific practice/game, not just the type)
  const titleCounts = completedSessions.reduce((acc: any, s) => {
    const key = s.title || s.type;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const mostCommonType = Object.keys(titleCounts).sort((a, b) => titleCounts[b] - titleCounts[a])[0] || "—";

  const recentSessions = sessions.slice(0, 3);

  // Top weak spot for the Suggested Focus card
  const insightSessions = completedSessions.map(s => ({
    started_at: s.started_at,
    config: s.config as SessionConfig | null,
  }));
  const weakSpots = computeWeakSpotsByClubShape(insightSessions);
  const topWeakSpot = weakSpots.find(w => w.totalReps >= 3) ?? null;
  return (
    <div className="min-h-screen bg-background pb-20">

      {/* Hero — gradient banner with white skill cards */}
      <div className="dashboard-hero w-full">
        <div className="dashboard-hero-inner max-w-7xl mx-auto px-4 pt-8 pb-10">
          <WelcomeHint />
          <div className="mb-6">
            <h1 className="text-4xl font-semibold tracking-tighter text-white drop-shadow-sm">
              What are you practicing today?
            </h1>
            <p className="text-lg text-white/80 mt-2">
              Focused sessions. Real improvement.{" "}
              <span className="text-amber-200/95 font-medium">No fluff.</span>
            </p>
          </div>

          <DashboardHero loggedIn={!!user} />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-12 space-y-10">

        {/* Unsaved session reminder */}
        <PartialSessionBanner />

        {user && completedSessions.length > 0 && (
          <PwaInstallNudge hasCompletedSession />
        )}

        {/* One-tap repeat shortcuts */}
{user && <RepeatLastSessionCard />}

        {/* Strong Welcome for users with zero sessions */}
        {sessions.length === 0 && (
          <Card className="border-primary/30 bg-gradient-to-br from-card to-muted/30">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-3xl font-semibold tracking-tighter">Welcome to Golf Practice OS</h2>
                <p className="text-lg text-muted-foreground mt-3 max-w-md mx-auto">
                  A focused space for <strong>deliberate range practice</strong> — 
                  designed to complement Arccos, not replace it.
                </p>
              </div>

              <div className="max-w-xl mx-auto">
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  Most golfers waste range time on mindless repetition. 
                  This app helps you practice with purpose.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-background/60 rounded-xl p-4 border">
                    <div className="font-semibold mb-1 text-primary">Quick Block</div>
                    <div className="text-muted-foreground text-xs leading-snug">
                      One skill, one club, repeat. Fast when you know what you&apos;re working on.
                    </div>
                  </div>
                  <div className="bg-background/60 rounded-xl p-4 border">
                    <div className="font-semibold mb-1 text-primary">Random / Transfer</div>
                    <div className="text-muted-foreground text-xs leading-snug">
                      Mixed bag, varied shots — the gold standard for course transfer.
                    </div>
                  </div>
                  <div className="bg-background/60 rounded-xl p-4 border">
                    <div className="font-semibold mb-1 text-primary">Games &amp; Challenges</div>
                    <div className="text-muted-foreground text-xs leading-snug">
                      Pressure training. 10-Ball, Lag Ladders, Up &amp; Downs — builds mental game.
                    </div>
                  </div>
                  <div className="bg-background/60 rounded-xl p-4 border">
                    <div className="font-semibold mb-1 text-primary">Calendar + Planning</div>
                    <div className="text-muted-foreground text-xs leading-snug">
                      Schedule sessions in advance. Consistency is the real secret.
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    Start with 20–30 minutes of Quick Block or Random / Transfer today.
                    You’ll feel the difference.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Programs — structured multi-phase training plans */}
        {user && (
          <Link href="/programs">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                    <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-0.5">
                      Programs
                    </div>
                    <div className="font-semibold">Driver Program</div>
                    <div className="text-sm text-muted-foreground">
                      TPI setup + 7-phase fast-learning protocol
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Suggested Focus — derived from weak spots analysis */}
        {user && topWeakSpot && (
          <Link href="/practice/block">
            <Card className="border-l-4 border-l-rose-400 hover:shadow-md transition cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold tracking-widest text-rose-600 dark:text-rose-400 uppercase mb-0.5">
                      Suggested focus
                    </div>
                    <div className="font-semibold">{topWeakSpot.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {topWeakSpot.hitRate}% hit rate across {topWeakSpot.totalReps} reps — work on this today
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Insights shortcut — visible once user has sessions */}
        {user && completedSessions.length >= 3 && (
          <Link href="/insights">
            <Card className="border-l-4 border-l-violet-400 hover:shadow-md transition cursor-pointer">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">Shot Insights</div>
                    <div className="text-sm text-muted-foreground">Weak spots by club, shape &amp; time of day</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Real Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-orange-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <div className="text-3xl font-semibold tabular-nums">{streak}</div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-semibold tabular-nums">{sessionsThisMonth.length}</div>
                  <div className="text-sm text-muted-foreground">Sessions This Month</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-3xl font-semibold tabular-nums">{totalHours}h</div>
                  <div className="text-sm text-muted-foreground">Focused Time</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-accent">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="text-base font-semibold leading-snug line-clamp-2">{mostCommonType}</div>
                  <div className="text-sm text-muted-foreground">Most Practiced</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions + Tip */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold tracking-tight text-xl">Recent Sessions</h2>
              <Link href="/history" className="text-sm text-primary hover:underline">View all →</Link>
            </div>
            {recentSessions.length > 0 ? (
              <div className="space-y-3">
                {recentSessions.map((session) => (
                  <Card key={session.id} className="golf-card">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{session.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(session.started_at), "MMM d")} • {getSessionDurationMinutes(session) || "?"} min
                          {session.overall_feel && ` • Feel ${session.overall_feel}/5`}
                        </div>
                      </div>
                      <Link href="/history">
                        <Button variant="ghost" size="sm">Details</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="golf-card">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Your recent sessions will appear here after you practice.
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <h2 className="font-semibold tracking-tight text-xl mb-3">Deliberate Practice Tip</h2>
            <Card className="bg-accent text-accent-foreground border-accent">
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed font-medium">
                  After every session, spend 5 minutes with your eyes closed replaying your best 3 shots.
                  This is when the brain consolidates motor learning (Huberman protocol).
                </p>
                <div className="text-xs opacity-70 mt-4">— Neural replay window is open right after focused practice</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

    </div>
  );
}
