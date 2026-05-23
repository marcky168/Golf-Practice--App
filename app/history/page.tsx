import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

type PracticeSessionRow = Database["public"]["Tables"]["practice_sessions"]["Row"];
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Target, Shuffle, Award, Calendar } from "lucide-react";
import { HistorySessionDetail } from "./HistorySessionDetail";
import { PracticeTrends } from "@/components/practice/PracticeTrends";
import { getSessionDurationMinutes } from "@/lib/practice/session-duration";

export default async function HistoryPage() {
  const supabase = await createClient();
  let sessions: PracticeSessionRow[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from("practice_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("History fetch error:", error);
    }
    sessions = data ?? [];
  }

  const hasSessions = sessions.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20 max-w-4xl mx-auto px-4 pt-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tighter">Practice History</h1>
          <p className="text-muted-foreground">All your deliberate work in one place.</p>
        </div>
        <Link href="/practice">
          <Button>New Session</Button>
        </Link>
      </div>

      {!hasSessions && (
        <div className="text-center py-16 border rounded-2xl bg-card">
          <Target className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-xl font-medium tracking-tight">Your practice journey starts here</p>
          <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
            Every session you complete will appear here with notes, reflections, and scores.
            This becomes your personal coaching log over time.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/practice/block">
              <Button size="lg" variant="default">Try Block Practice first</Button>
            </Link>
            <Link href="/practice">
              <Button size="lg" variant="outline">Browse all modes</Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Tip: Start with 15–20 minutes of focused Block work today.
          </p>
        </div>
      )}

      {hasSessions && (
        <>
        <Card className="golf-card mb-8">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold tracking-tight mb-1">Trends</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Shot ratings and block consistency over time — block practice pays off here.
            </p>
            <PracticeTrends sessions={sessions.map(s => ({
              started_at: s.started_at,
              type: s.type,
              config: s.config as import("@/lib/practice/types").SessionConfig | null,
            }))} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {sessions.map((session) => {
            const date = new Date(session.started_at);
            const icon = 
              session.type === "block" ? <Target className="h-4 w-4" /> :
              session.type === "random" ? <Shuffle className="h-4 w-4" /> :
              <Award className="h-4 w-4" />;

            return (
              <Card key={session.id} className="golf-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-primary">{icon}</span>
                        <span className="font-semibold text-lg tracking-tight">{session.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                          {session.type}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground flex items-center gap-3">
                        <span>{format(date, "MMM d, yyyy • h:mm a")}</span>
                        {(() => {
                          const mins = getSessionDurationMinutes(session);
                          return mins > 0 ? <span>{mins} min</span> : null;
                        })()}
                        {session.overall_feel && (
                          <span>Feel: {session.overall_feel}/5</span>
                        )}
                        {session.score != null && (
                          <span className="font-medium text-accent">Score: {session.score}</span>
                        )}
                      </div>

                      {session.notes && (
                        <p className="text-sm mt-3 line-clamp-2 text-muted-foreground">{session.notes}</p>
                      )}
                    </div>

                    <div>
                      <HistorySessionDetail session={session} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}
