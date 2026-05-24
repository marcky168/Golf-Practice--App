import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Shuffle, Award, ArrowLeft, Wrench, BookOpen, Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

async function getLastImproveNote(): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("practice_sessions")
    .select("config")
    .eq("user_id", user.id)
    .neq("type", "planned")
    .order("started_at", { ascending: false })
    .limit(10);

  for (const row of data ?? []) {
    const note = (row.config as any)?.reflection?.improve;
    if (typeof note === "string" && note.trim().length > 0) return note.trim();
  }
  return null;
}

export default async function PracticeHub() {
  const lastNote = await getLastImproveNote();

  return (
    <div className="min-h-screen bg-background pb-20 max-w-3xl mx-auto px-4 pt-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <h1 className="text-3xl font-semibold tracking-tighter mb-2">Practice Sessions</h1>
      <p className="text-muted-foreground mb-6">Choose your mode. All sessions are designed for real improvement.</p>

      {/* Last session "improve" carry-forward */}
      {lastNote && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 flex gap-3 items-start">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
              From your last session — work on this
            </div>
            <p className="text-sm text-foreground leading-snug">"{lastNote}"</p>
          </div>
        </div>
      )}

      {/* Gentle onboarding guidance */}
      <div className="mb-8 rounded-2xl border bg-muted/40 p-5 text-sm">
        <div className="font-medium mb-2">Not sure where to start?</div>
        <div className="text-muted-foreground">
          Most players improve fastest with a mix of <strong>Block</strong> (for feel) and <strong>Random</strong> (for transfer).
          Try one 20–30 minute session of each this week.
        </div>
      </div>

      <div className="grid gap-4">
        <Link href="/practice/builder">
          <Card className="golf-card hover:border-primary transition cursor-pointer border-primary/40">
            <CardHeader className="flex flex-row items-center gap-4">
              <Wrench className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Practice Builder</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Skill, club, blocks, cadence timer, block/random toggle, per-block logging
                </p>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/practice/drills">
          <Card className="golf-card hover:border-primary transition cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Block Drill Library</CardTitle>
                <p className="text-sm text-muted-foreground">Pre-built sessions — driver tempo, wedge ladder, putting pressure</p>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/practice/block">
          <Card className="golf-card hover:border-primary transition cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <Target className="h-8 w-8 text-primary" />
              <div>
                <CardTitle>Block Practice</CardTitle>
                <p className="text-sm text-muted-foreground">Deep repetitive focus on a single skill</p>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/practice/random">
          <Card className="golf-card hover:border-accent transition cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <Shuffle className="h-8 w-8 text-accent" />
              <div>
                <CardTitle>Random Practice</CardTitle>
                <p className="text-sm text-muted-foreground">Interleaved, course-like variability — best for transfer</p>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/practice/games">
          <Card className="golf-card hover:border-accent transition cursor-pointer">
            <CardHeader className="flex flex-row items-center gap-4">
              <Award className="h-8 w-8 text-accent" />
              <div>
                <CardTitle>Games &amp; Challenges</CardTitle>
                <p className="text-sm text-muted-foreground">Pressure training with scoring</p>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="mt-12 text-center text-xs text-muted-foreground">
        Pro tip: Most players improve fastest with 70% random + 30% targeted block work.
      </div>
    </div>
  );
}
