"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { getUserSessions, getClubBag, saveClubBag, signOut, type ClubEntry } from "@/app/actions";
import { getLoggedPracticeMinutes } from "@/lib/practice/session-duration";
import {
  User, LogOut, Target, Trophy, Clock, TrendingUp,
  Save, Plus, Trash2, Loader2, Check,
} from "lucide-react";
import { toast } from "sonner";

// ─── Master club list ─────────────────────────────────────────────────────────
const MASTER_CLUBS: { category: string; clubs: string[] }[] = [
  { category: "Woods",   clubs: ["Driver", "2-Wood", "3-Wood", "4-Wood", "5-Wood", "7-Wood"] },
  { category: "Hybrids", clubs: ["2-Hybrid", "3-Hybrid", "4-Hybrid", "5-Hybrid", "6-Hybrid"] },
  { category: "Irons",   clubs: ["1-Iron", "2-Iron", "3-Iron", "4-Iron", "5-Iron", "6-Iron", "7-Iron", "8-Iron", "9-Iron"] },
  { category: "Wedges",  clubs: ["PW", "GW (50°)", "GW (52°)", "SW (54°)", "SW (56°)", "LW (58°)", "LW (60°)", "LW (64°)"] },
  { category: "Putter",  clubs: ["Putter"] },
];
const MASTER_FLAT = MASTER_CLUBS.flatMap(c => c.clubs);

function calculateStreak(sessions: any[]): number {
  if (!sessions.length) return 0;
  const uniqueDates = Array.from(new Set(
    sessions.map(s => new Date(s.started_at).toISOString().split("T")[0])
  )).sort().reverse();
  let streak = 0;
  let cur = new Date(); cur.setHours(0, 0, 0, 0);
  for (const d of uniqueDates) {
    const sd = new Date(d);
    const diff = Math.floor((cur.getTime() - sd.getTime()) / 86400000);
    if (diff === streak) { streak++; cur = sd; } else if (diff > streak) break;
  }
  return streak;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();

  // User & stats
  const [email, setEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; streak: number; hours: number; mostCommon: string } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Club bag
  const [bag, setBag] = useState<ClubEntry[]>([]);
  const [loadingBag, setLoadingBag] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customClub, setCustomClub] = useState("");

  useEffect(() => {
    // Load user + stats
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? null);
        const sessions = await getUserSessions(100);
        const typeCounts: Record<string, number> = {};
        sessions.forEach(s => { typeCounts[s.type] = (typeCounts[s.type] || 0) + 1; });
        const mostCommon = Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a])[0] || "—";
        setStats({
          total:      sessions.length,
          streak:     calculateStreak(sessions),
          hours:      Math.round((getLoggedPracticeMinutes(sessions) / 60) * 10) / 10,
          mostCommon: mostCommon.charAt(0).toUpperCase() + mostCommon.slice(1),
        });
      }
      setLoadingStats(false);
    })();

    // Load bag
    getClubBag().then(saved => {
      setBag(saved.length > 0 ? saved : []);
      setLoadingBag(false);
    });
  }, []);

  // ── Bag editing ─────────────────────────────────────────────────────────────
  const selectedNames = new Set(bag.map(e => e.club));

  function toggleClub(name: string) {
    if (selectedNames.has(name)) {
      setBag(prev => prev.filter(e => e.club !== name));
    } else {
      const masterOrder = [...MASTER_FLAT, ...bag.filter(e => !MASTER_FLAT.includes(e.club)).map(e => e.club)];
      setBag(prev => [...prev, { club: name, carry: 0 }].sort((a, b) => {
        const ai = masterOrder.indexOf(a.club); const bi = masterOrder.indexOf(b.club);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      }));
    }
  }

  function updateCarry(club: string, value: string) {
    setBag(prev => prev.map(e => e.club === club ? { ...e, carry: parseInt(value) || 0 } : e));
  }

  function removeClub(club: string) {
    setBag(prev => prev.filter(e => e.club !== club));
  }

  function addCustomClub() {
    const name = customClub.trim();
    if (!name) return;
    if (selectedNames.has(name)) { toast.error("Already in bag."); return; }
    setBag(prev => [...prev, { club: name, carry: 0 }]);
    setCustomClub("");
  }

  async function handleSave() {
    const invalid = bag.filter(e => e.club !== "Putter" && !e.carry);
    if (invalid.length) { toast.error("Enter carry for: " + invalid.map(e => e.club).join(", ")); return; }
    setSaving(true);
    const res = await saveClubBag(bag);
    setSaving(false);
    if (res.success) toast.success("Club bag saved!");
    else toast.error(res.error || "Failed to save.");
  }

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
    router.push("/login");
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24 max-w-2xl mx-auto px-4 pt-6">
      <h1 className="text-3xl font-semibold tracking-tighter mb-8">Profile</h1>

      {/* ── User card ─────────────────────────────────────────────────────── */}
      <div className="bg-primary text-primary-foreground rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <User className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="text-xs opacity-60 mb-0.5">Signed in as</div>
            <div className="font-semibold truncate max-w-[220px]">{email || "…"}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
        >
          <LogOut className="h-4 w-4 mr-1.5" /> Sign out
        </Button>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="font-semibold text-lg mb-4">Practice Stats</h2>
        {loadingStats ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading stats…
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border-l-4 border-l-primary rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Sessions</div>
              </div>
            </div>
            <div className="bg-card border-l-4 border-l-orange-400 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Trophy className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">{stats.streak}</div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </div>
            </div>
            <div className="bg-card border-l-4 border-l-blue-400 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">{stats.hours}</div>
                <div className="text-xs text-muted-foreground">Hours Practiced</div>
              </div>
            </div>
            <div className="bg-card border-l-4 border-l-accent rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <div>
                <div className="text-lg font-semibold">{stats.mostCommon}</div>
                <div className="text-xs text-muted-foreground">Most Common</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No sessions yet — start practicing!</p>
        )}
      </div>

      {/* ── My Golf Bag ───────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="font-semibold text-lg mb-1">My Golf Bag</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Select your clubs and enter carry distances. Used to personalise drills and auto-suggest targets in games.
        </p>

        {loadingBag ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading bag…
          </div>
        ) : (
          <>
            {/* Step 1 — pick clubs */}
            <div className="mb-6">
              <div className="text-xs font-semibold text-muted-foreground tracking-wider mb-4">STEP 1 — SELECT YOUR CLUBS</div>
              <div className="space-y-4">
                {MASTER_CLUBS.map(({ category, clubs }) => (
                  <div key={category}>
                    <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider">{category.toUpperCase()}</div>
                    <div className="flex flex-wrap gap-2">
                      {clubs.map(club => {
                        const selected = selectedNames.has(club);
                        return (
                          <button
                            key={club}
                            onClick={() => toggleClub(club)}
                            className={"px-3 py-1.5 rounded-full border text-sm font-medium transition flex items-center gap-1.5 " + (
                              selected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card hover:bg-muted border-border"
                            )}
                          >
                            {selected && <Check className="h-3 w-3" />}
                            {club}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Custom club */}
              <div className="mt-4">
                <div className="text-xs font-semibold text-muted-foreground mb-2 tracking-wider">CUSTOM</div>
                <div className="flex gap-2">
                  <input
                    value={customClub}
                    onChange={e => setCustomClub(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomClub()}
                    placeholder="e.g. 48° Wedge, Chipper…"
                    className="flex-1 rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button variant="outline" onClick={addCustomClub} disabled={!customClub.trim()}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Step 2 — enter distances */}
            {bag.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-muted-foreground tracking-wider mb-4">STEP 2 — ENTER CARRY DISTANCES</div>

                <div className="grid grid-cols-[1fr_110px_36px] gap-2 mb-2 px-1">
                  <div className="text-xs font-semibold text-muted-foreground">CLUB</div>
                  <div className="text-xs font-semibold text-muted-foreground text-center">CARRY (YD)</div>
                  <div />
                </div>

                <div className="space-y-2">
                  {bag.map(entry => (
                    <div key={entry.club} className="grid grid-cols-[1fr_110px_36px] gap-2 items-center">
                      <div className="rounded-xl border bg-muted/40 px-3 py-2.5 text-sm font-medium truncate">
                        {entry.club}
                      </div>
                      {entry.club === "Putter" ? (
                        <div className="rounded-xl border bg-muted/40 px-3 py-2.5 text-sm text-center text-muted-foreground">N/A</div>
                      ) : (
                        <input
                          type="number"
                          min={1}
                          max={400}
                          value={entry.carry || ""}
                          onChange={e => updateCarry(entry.club, e.target.value)}
                          placeholder="150"
                          className="rounded-xl border bg-card px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      )}
                      <button
                        onClick={() => removeClub(entry.club)}
                        className="text-muted-foreground hover:text-destructive transition p-1 justify-self-center"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bag.length === 0 && (
              <div className="mb-6 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No clubs selected yet. Tap clubs above to build your bag.
              </div>
            )}

            <Button size="lg" className="w-full h-14" onClick={handleSave} disabled={saving || bag.length === 0}>
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                : <><Save className="mr-2 h-4 w-4" /> Save Club Bag ({bag.length} clubs)</>
              }
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Distances personalise drill yardages and auto-suggest target zones in games.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
