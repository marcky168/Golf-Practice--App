"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SessionConfig } from "@/lib/practice/types";
import { durationMinutesFromRange } from "@/lib/practice/session-duration";
import type { ClubEntry } from "@/types/supabase";

export type { ClubEntry };

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

  // First check if user is authenticated
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

export async function getPlannedSessions() {
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();

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
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true };
}

// =============================================
// Club Bag
// =============================================

export async function getClubBag(): Promise<ClubEntry[]> {
  const supabase = await createClient();
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, club_bag: clubBag }, { onConflict: "id" });

  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { success: true };
}
