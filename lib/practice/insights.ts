import type { RepRecordSnapshot, SessionConfig } from "./types";

type SessionRow = {
  started_at: string;
  config: SessionConfig | null;
};

// ── Shared helpers ────────────────────────────────────────────────────────────

function primaryHit(ec: NonNullable<RepRecordSnapshot["errorCorrection"]>): "yes" | "partial" | "no" | null {
  return ec.hitIntendedShot ?? ec.startedOnLine ?? null;
}

// ── Weak spots ────────────────────────────────────────────────────────────────

export type WeakSpotRow = {
  key: string;
  label: string;
  hitRate: number;          // 0–100 — "yes" answers only
  successCount: number;
  totalReps: number;
  leftMisses: number;
  rightMisses: number;
  shortMisses: number;
  longMisses: number;
};

function buildWeakSpots(
  sessions: SessionRow[],
  keyFn: (rep: RepRecordSnapshot) => string | null,
  labelFn: (key: string) => string,
  minReps: number
): WeakSpotRow[] {
  const map = new Map<string, {
    yes: number; total: number;
    left: number; right: number; short: number; long: number;
  }>();

  for (const session of sessions) {
    for (const rep of session.config?.repRecords ?? []) {
      const ec = rep.errorCorrection;
      if (!ec) continue;
      const key = keyFn(rep);
      if (!key) continue;
      const ans = primaryHit(ec);
      if (!ans) continue;

      const e = map.get(key) ?? { yes: 0, total: 0, left: 0, right: 0, short: 0, long: 0 };
      e.total += 1;
      if (ans === "yes") e.yes += 1;
      if (ec.startDirection === "left")  e.left  += 1;
      if (ec.startDirection === "right") e.right += 1;
      if (ec.distanceMiss === "short")   e.short += 1;
      if (ec.distanceMiss === "long")    e.long  += 1;
      map.set(key, e);
    }
  }

  return [...map.entries()]
    .filter(([, e]) => e.total >= minReps)
    .map(([key, e]) => ({
      key,
      label: labelFn(key),
      hitRate: Math.round((e.yes / e.total) * 100),
      successCount: e.yes,
      totalReps: e.total,
      leftMisses: e.left,
      rightMisses: e.right,
      shortMisses: e.short,
      longMisses: e.long,
    }))
    .sort((a, b) => a.hitRate - b.hitRate);
}

export function computeWeakSpotsByClub(sessions: SessionRow[]): WeakSpotRow[] {
  return buildWeakSpots(sessions, r => r.drill?.club ?? null, k => k, 3);
}

export function computeWeakSpotsByShape(sessions: SessionRow[]): WeakSpotRow[] {
  return buildWeakSpots(sessions, r => r.shape ?? null, k => k, 5);
}

export function computeWeakSpotsByClubShape(sessions: SessionRow[]): WeakSpotRow[] {
  return buildWeakSpots(
    sessions,
    r => (r.drill?.club && r.shape ? `${r.drill.club}__${r.shape}` : null),
    k => { const [club, shape] = k.split("__"); return `${club} · ${shape}`; },
    3
  );
}

// ── Commitment on misses (Rule 9) ─────────────────────────────────────────────

export type CommitmentStat = {
  totalMissesRated: number;   // misses where the 10/10-commitment check was answered
  committedMisses: number;    // committed === true
  uncommittedMisses: number;  // committed === false ("commitment leaks")
  committedPct: number;       // 0–100 — share of rated misses hit with full commitment
};

/**
 * The `committed` flag is only recorded on misses, so any rep with it set is a
 * miss. A high uncommitted share means the cheapest strokes are mental, not swing.
 */
export function computeCommitmentStat(sessions: SessionRow[]): CommitmentStat {
  let committed = 0;
  let uncommitted = 0;
  for (const session of sessions) {
    for (const rep of session.config?.repRecords ?? []) {
      const c = rep.errorCorrection?.committed;
      if (c === undefined) continue;
      if (c) committed += 1;
      else uncommitted += 1;
    }
  }
  const total = committed + uncommitted;
  return {
    totalMissesRated: total,
    committedMisses: committed,
    uncommittedMisses: uncommitted,
    committedPct: total > 0 ? Math.round((committed / total) * 100) : 0,
  };
}

// ── Time of day ───────────────────────────────────────────────────────────────

export type TimeOfDayRow = {
  label: string;
  hour: number;
  avgRating: number | null;
  sessionCount: number;
};

export function computeTimeOfDay(sessions: SessionRow[]): TimeOfDayRow[] {
  const buckets: Record<string, { ratings: number[]; count: number; hour: number }> = {
    Morning:   { ratings: [], count: 0, hour: 8  },
    Afternoon: { ratings: [], count: 0, hour: 14 },
    Evening:   { ratings: [], count: 0, hour: 19 },
  };

  for (const session of sessions) {
    const hour = new Date(session.started_at).getHours();
    const bucket =
      hour >= 5  && hour < 12 ? "Morning"   :
      hour >= 12 && hour < 17 ? "Afternoon" :
      "Evening";

    buckets[bucket].count += 1;
    for (const rep of session.config?.repRecords ?? []) {
      if (rep.rating != null) buckets[bucket].ratings.push(rep.rating);
    }
  }

  return Object.entries(buckets).map(([label, d]) => ({
    label,
    hour: d.hour,
    avgRating: d.ratings.length
      ? Math.round((d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length) * 10) / 10
      : null,
    sessionCount: d.count,
  }));
}

// ── Pre-session state correlation ─────────────────────────────────────────────

export type PreSessionRow = {
  energyLevel: number;
  avgRating: number | null;
  sessionCount: number;
};

export function computePreSessionCorrelation(sessions: SessionRow[]): PreSessionRow[] {
  const byEnergy = new Map<number, { ratings: number[]; count: number }>();

  for (const session of sessions) {
    const pre = session.config?.preSessionState;
    if (!pre?.energy) continue;

    const e = byEnergy.get(pre.energy) ?? { ratings: [], count: 0 };
    e.count += 1;
    for (const rep of session.config?.repRecords ?? []) {
      if (rep.rating != null) e.ratings.push(rep.rating);
    }
    byEnergy.set(pre.energy, e);
  }

  return [...byEnergy.entries()]
    .map(([level, e]) => ({
      energyLevel: level,
      avgRating: e.ratings.length
        ? Math.round((e.ratings.reduce((a, b) => a + b, 0) / e.ratings.length) * 10) / 10
        : null,
      sessionCount: e.count,
    }))
    .sort((a, b) => a.energyLevel - b.energyLevel);
}

// ── Trajectory weak spots ─────────────────────────────────────────────────────

export function computeWeakSpotsByTrajectory(sessions: SessionRow[]): WeakSpotRow[] {
  return buildWeakSpots(sessions, r => r.trajectory ?? null, k => k, 5);
}

// ── Block consistency trend ───────────────────────────────────────────────────

export type BlockConsistencyRow = {
  date: string;
  avgConsistency: number;
  sessionTitle: string;
};

export function computeBlockConsistencyTrend(sessions: SessionRow[]): BlockConsistencyRow[] {
  const rows: BlockConsistencyRow[] = [];
  for (const session of sessions) {
    const blocks = session.config?.blockResults ?? [];
    const scored = blocks.filter(b => b.consistency != null);
    if (scored.length === 0) continue;
    const avg = scored.reduce((s, b) => s + (b.consistency ?? 0), 0) / scored.length;
    rows.push({
      date: new Date(session.started_at).toISOString().split("T")[0],
      avgConsistency: Math.round(avg * 10) / 10,
      sessionTitle: session.config?.title ?? "Block session",
    });
  }
  return rows.slice(-12); // last 12 block sessions
}

// ── Least-practiced clubs ─────────────────────────────────────────────────────

export type UnpracticedClub = {
  club: string;
  daysSinceLastSeen: number;
  totalReps: number;
};

export function computeLeastPracticedClubs(
  sessions: SessionRow[],
  bagClubs: string[]
): UnpracticedClub[] {
  if (bagClubs.length === 0) return [];

  const lastSeen = new Map<string, number>();
  const repCounts = new Map<string, number>();

  for (const session of sessions) {
    const date = new Date(session.started_at).getTime();
    for (const rep of session.config?.repRecords ?? []) {
      const club = rep.drill?.club;
      if (!club) continue;
      repCounts.set(club, (repCounts.get(club) ?? 0) + 1);
      if ((lastSeen.get(club) ?? 0) < date) lastSeen.set(club, date);
    }
  }

  const now = Date.now();
  return bagClubs
    .map(club => ({
      club,
      daysSinceLastSeen: lastSeen.has(club)
        ? Math.floor((now - lastSeen.get(club)!) / 86_400_000)
        : 999,
      totalReps: repCounts.get(club) ?? 0,
    }))
    .filter(c => c.daysSinceLastSeen >= 7)
    .sort((a, b) => b.daysSinceLastSeen - a.daysSinceLastSeen)
    .slice(0, 4);
}

// ── Direction insight helper (used by WeakSpotsPanel) ────────────────────────

export function directionInsight(row: WeakSpotRow): string | null {
  const total = row.leftMisses + row.rightMisses;
  if (total < 3) return null;
  const leftPct = row.leftMisses / total;
  if (leftPct >= 0.65) return `Starts left on ${Math.round(leftPct * 100)}% of misses`;
  if (leftPct <= 0.35) return `Starts right on ${Math.round((1 - leftPct) * 100)}% of misses`;
  return null;
}

// ── "What to work on" recommendations ─────────────────────────────────────────

export type PracticeRecommendation = {
  href: string;
  label: string;
};

export type WeakSpotKind = "club" | "shape" | "trajectory" | "club-shape";

/**
 * Maps a weak spot to the most relevant scored game or program.
 * Club keys look like "Driver", "3-Wood", "7-Iron", "PW", "56°", "Putter".
 */
export function recommendPracticeFor(kind: WeakSpotKind, row: WeakSpotRow): PracticeRecommendation | null {
  if (kind === "shape" || kind === "trajectory") {
    return { href: "/practice/games/9-shot-matrix", label: "9-Shot Flight Matrix" };
  }

  const club = (kind === "club-shape" ? row.key.split("__")[0] : row.key).toLowerCase();
  if (club.includes("putter")) {
    return { href: "/practice/games/lag-putting-ladder", label: "Lag Putting Ladder" };
  }
  if (club.includes("°") || /\b(pw|gw|sw|lw)\b/.test(club)) {
    return { href: "/practice/games/pitch-ladder", label: "Pitch Ladder" };
  }
  if (club.includes("driver") || club.includes("wood") || club.includes("hybrid")) {
    return { href: "/programs/driver-program", label: "Driver Program" };
  }
  if (club.includes("iron")) {
    if (kind === "club-shape") {
      return { href: "/practice/games/9-shot-matrix", label: "9-Shot Flight Matrix" };
    }
    return { href: "/practice/games/10-ball-accuracy", label: "10-Ball Accuracy" };
  }
  return null;
}

export function hitRateColor(rate: number): string {
  if (rate >= 80) return "text-primary";
  if (rate >= 65) return "text-amber-600 dark:text-amber-400";
  if (rate >= 50) return "text-orange-600 dark:text-orange-400";
  return "text-rose-600 dark:text-rose-400";
}

export function hitRateBarColor(rate: number): string {
  if (rate >= 80) return "bg-primary";
  if (rate >= 65) return "bg-amber-500";
  if (rate >= 50) return "bg-orange-500";
  return "bg-rose-500";
}

// ── Short-game scenario club insights ─────────────────────────────────────────

export type ScenarioClubStats = {
  club: string;
  totalReps: number;
  goodCount: number;
  mishitCount: number;
  wrongClubCount: number;
  successRate: number; // 0–100
};

export type LieInsight = {
  lie: string;
  totalReps: number;
  clubs: ScenarioClubStats[];  // sorted by totalReps desc
  bestClub: string | null;     // highest success rate (min 2 reps)
  mostUsed: string | null;     // most frequently reached for
  insight: string | null;      // actionable coaching observation
};

export function computeScenarioClubInsights(sessions: SessionRow[]): LieInsight[] {
  // lie → club → counts
  const map = new Map<string, Map<string, { good: number; mishit: number; wrong: number }>>();

  for (const session of sessions) {
    for (const rep of session.config?.repRecords ?? []) {
      if (!rep.drill?.scenarioBased || !rep.scenarioClub) continue;
      const lie = rep.drill.name;
      if (!lie) continue;

      if (!map.has(lie)) map.set(lie, new Map());
      const lieMap = map.get(lie)!;
      if (!lieMap.has(rep.scenarioClub)) {
        lieMap.set(rep.scenarioClub, { good: 0, mishit: 0, wrong: 0 });
      }
      const e = lieMap.get(rep.scenarioClub)!;
      if (rep.scenarioOutcome === "good")       e.good   += 1;
      else if (rep.scenarioOutcome === "mishit") e.mishit += 1;
      else if (rep.scenarioOutcome === "wrong-club") e.wrong += 1;
    }
  }

  const insights: LieInsight[] = [];

  for (const [lie, clubMap] of map) {
    const clubs: ScenarioClubStats[] = [...clubMap.entries()]
      .map(([club, c]) => {
        const total = c.good + c.mishit + c.wrong;
        return {
          club,
          totalReps:      total,
          goodCount:      c.good,
          mishitCount:    c.mishit,
          wrongClubCount: c.wrong,
          successRate:    total > 0 ? Math.round((c.good / total) * 100) : 0,
        };
      })
      .filter(c => c.totalReps >= 2)
      .sort((a, b) => b.totalReps - a.totalReps);

    const totalReps = clubs.reduce((s, c) => s + c.totalReps, 0);
    if (totalReps < 3) continue;

    const mostUsed = clubs[0]?.club ?? null;
    const bestClub = [...clubs]
      .sort((a, b) => b.successRate - a.successRate)[0]?.club ?? null;

    // Coaching insight
    let insight: string | null = null;
    const mostUsedStats = clubs.find(c => c.club === mostUsed);
    const bestStats     = clubs.find(c => c.club === bestClub);

    if (mostUsed && bestClub && mostUsed !== bestClub && mostUsedStats && bestStats) {
      const diff = bestStats.successRate - mostUsedStats.successRate;
      if (diff >= 15) {
        insight = `Your ${bestClub} outperforms your go-to ${mostUsed} here `
          + `(${bestStats.successRate}% vs ${mostUsedStats.successRate}%) — try making it your first choice.`;
      }
    } else if (mostUsedStats) {
      if (mostUsedStats.successRate >= 75) {
        insight = `${mostUsed} is your most reliable club from this lie at ${mostUsedStats.successRate}% — trust it.`;
      } else if (mostUsedStats.successRate < 45 && totalReps >= 5) {
        insight = `${mostUsed} is struggling here at ${mostUsedStats.successRate}% — experiment with a different club next session.`;
      }
    }

    insights.push({ lie, totalReps, clubs, bestClub, mostUsed, insight });
  }

  return insights.sort((a, b) => b.totalReps - a.totalReps);
}
