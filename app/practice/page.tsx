import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SkillFirstPicker } from "@/components/SkillFirstPicker";

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
    const note = (row.config as { reflection?: { improve?: string } } | null)?.reflection?.improve;
    if (typeof note === "string" && note.trim().length > 0) return note.trim();
  }
  return null;
}

export default async function PracticeHub() {
  const lastNote = await getLastImproveNote();

  return (
    <div className="min-h-screen bg-background pb-20 max-w-2xl mx-auto px-4 pt-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        ← Back to Dashboard
      </Link>

      <h1 className="text-3xl font-semibold tracking-tighter mb-2">What are you practicing?</h1>
      <p className="text-muted-foreground mb-6">
        Tap a skill to start a focused session.
      </p>

      {lastNote && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 flex gap-3 items-start">
          <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-semibold tracking-widest text-primary uppercase mb-1">
              From your last session
            </div>
            <p className="text-sm text-foreground leading-snug">&ldquo;{lastNote}&rdquo;</p>
          </div>
        </div>
      )}

      <SkillFirstPicker variant="page" />
    </div>
  );
}
