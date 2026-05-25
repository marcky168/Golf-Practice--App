"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SessionConfig } from "@/lib/practice/types";
import { durationMinutesFromRange } from "@/lib/practice/session-duration";
import type { ClubEntry } from "@/types/supabase";

export type { ClubEntry };

async function requireSupabaseClient() {
  return createClient();
}

export type SaveSessionInput = {
  type: "block" | "random" | "mixed" | "game" | "planned";
  title: string;
  durationMinutes: number;
  /** Wall-clock session start (ISO). When set with endedAt, duration is derived from the range. */
  startedAt?: string;
  endedAt?: string;
  config: SessionConfig | any;           // allow game-specific data
  reflection?: {
    well?: string;
    improve?: string;
    energy?: number;
    focus?: number;
    replayDone?: boolean;
  };
  notes?: string;
  overallFeel?: number;
  ballsUsed?: number;
  score?: number;
};

export async function savePracticeSession(input: SaveSessionInput) {
  const supabase = await requireSupabaseClient();
  if (!supabase) return { error: "Authentication service is not configured." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const endedAt = input.endedAt ?? new Date().toISOString();
  const startedAt = input.startedAt ?? endedAt;
  const durationMinutes =
    input.startedAt && input.endedAt
      ? durationMinutesFromRange(input.startedAt, input.endedAt)
      : input.durationMinutes;

  const { error } = await supabase.from("practice_sessions").insert({
    user_id: user.id,
    type: input.type,
    title: input.title,
    duration_minutes: durationMinutes,
    config: input.config,
    reflection: input.reflection || null,
    notes: input.notes || null,
    overall_feel: input.overallFeel || null,
    balls_used: input.ballsUsed || null,
    score: input.score || null,
    started_at: startedAt,
    ended_at: endedAt,
  });

  if (error) {
    console.error("Supabase save error:", error);
    return { error: error.message };
  }

  revalidatePath("/history");
  revalidatePath("/");

  return { success: true };
}

export async function updateSessionNotes(sessionId: string, notes: string) {
  const supabase = await requireSupabaseClient();
  if (!supabase) return { error: "Authentication service is not configured." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("practice_sessions")
    .update({ notes })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/history");
  return { success: true };
}

export async function getUserSessions(limit = 50) {
  const supabase = await requireSupabaseClient();
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return []; // Not logged in — return empty silently
  }

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    // Only log real errors (not auth/RLS issues)
    console.error("Error fetching sessions:", error);
    return [];
  }

  return data || [];
}

/**
 * Per-distance best make-streaks across the user's putting sessions.
 * Returns a map of distance label ("6 ft") → best consecutive makes ever.
 */
export async function getPuttingStreaksByDistance(): Promise<Record<string, number>> {
  const supabase = await requireSupabaseClient();
  if (!supabase) return {};

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("config")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(200);

  if (error || !data) return {};

  const best: Record<string, number> = {};
  for (const row of data) {
    const reps = (row.config as { repRecords?: Array<{
      drill?: { distance?: string; category?: string };
      scenarioOutcome?: string;
    }> } | null)?.repRecords;
    if (!reps?.length) continue;

    // Walk reps in order; track streak per-distance within this session, take max with global.
    const sessionBest: Record<string, number> = {};
    const sessionCurrent: Record<string, number> = {};
    for (const r of reps) {
      if (r.drill?.category !== "putting") continue;
      const dist = r.drill?.distance;
      if (!dist) continue;
      if (r.scenarioOutcome === "made") {
        sessionCurrent[dist] = (sessionCurrent[dist] ?? 0) + 1;
        sessionBest[dist] = Math.max(sessionBest[dist] ?? 0, sessionCurrent[dist]);
      } else if (r.scenarioOutcome === "missed") {
        sessionCurrent[dist] = 0;
      }
    }
    for (const [dist, n] of Object.entries(sessionBest)) {
      best[dist] = Math.max(best[dist] ?? 0, n);
    }
  }
  return best;
}

export async function getPlannedSessions() {
  const supabase = await requireSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("*")
    .eq("type", "planned")
    .order("started_at", { ascending: true });

  if (error) {
    console.error("Error fetching planned sessions:", error);
    return [];
  }

  return data || [];
}

// =============================================
// Authentication Actions
// =============================================

export async function signUp(email: string, password: string) {
  const supabase = await requireSupabaseClient();
  if (!supabase) return { error: "Authentication service is not configured." };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Check your email to confirm your account." };
}

export async function signIn(email: string, password: string) {
  const supabase = await requireSupabaseClient();
  if (!supabase) return { error: "Authentication service is not configured." };

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signOut() {
  const supabase = await requireSupabaseClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true };
}

// =============================================
// Club Bag
// =============================================

export async function getClubBag(): Promise<ClubEntry[]> {
  const supabase = await requireSupabaseClient();
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("profiles")
    .select("club_bag")
    .eq("id", user.id)
    .single();

  return (data?.club_bag as ClubEntry[]) || [];
}

export async function saveClubBag(clubBag: ClubEntry[]) {
  const supabase = await requireSupabaseClient();
  if (!supabase) return { error: "Authentication service is not configured." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, club_bag: clubBag }, { onConflict: "id" });

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { success: true };
}
