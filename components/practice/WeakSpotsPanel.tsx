"use client";

import Link from "next/link";
import type {
  WeakSpotRow,
  TimeOfDayRow,
  PreSessionRow,
  BlockConsistencyRow,
  UnpracticedClub,
  WeakSpotKind,
  CommitmentStat,
} from "@/lib/practice/insights";
import { directionInsight, hitRateColor, hitRateBarColor, recommendPracticeFor } from "@/lib/practice/insights";

// ── Shared sub-components ─────────────────────────────────────────────────────

function HitRateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${hitRateBarColor(rate)}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={`text-sm font-semibold tabular-nums w-9 text-right ${hitRateColor(rate)}`}>
        {rate}%
      </span>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h3 className="font-semibold text-base tracking-tight">{title}</h3>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function WeakSpotList({ rows, emptyMsg, kind }: { rows: WeakSpotRow[]; emptyMsg: string; kind?: WeakSpotKind }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">{emptyMsg}</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map(row => {
        const direction = directionInsight(row);
        const recommendation = kind && row.hitRate < 80 ? recommendPracticeFor(kind, row) : null;
        return (
          <div key={row.key}>
            <div className="flex items-center gap-3 mb-0.5">
              <span className="text-sm font-medium w-32 shrink-0 truncate">{row.label}</span>
              <HitRateBar rate={row.hitRate} />
              <span className="text-[11px] text-muted-foreground w-14 text-right shrink-0">
                {row.totalReps} rep{row.totalReps !== 1 ? "s" : ""}
              </span>
            </div>
            {direction && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 ml-32 pl-3">
                ↳ {direction}
              </p>
            )}
            {recommendation && (
              <p className="text-[11px] ml-32 pl-3">
                <Link href={recommendation.href} className="text-primary font-medium hover:underline">
                  Work on this: {recommendation.label} →
                </Link>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  byClub:            WeakSpotRow[];
  byShape:           WeakSpotRow[];
  byTrajectory:      WeakSpotRow[];
  byClubShape:       WeakSpotRow[];
  timeOfDay:         TimeOfDayRow[];
  preSessionCorr:    PreSessionRow[];
  blockConsistency:  BlockConsistencyRow[];
  leastPracticed:    UnpracticedClub[];
  commitment:        CommitmentStat;
  totalRepsLogged:   number;
}

export function WeakSpotsPanel({
  byClub,
  byShape,
  byTrajectory,
  byClubShape,
  timeOfDay,
  preSessionCorr,
  blockConsistency,
  leastPracticed,
  commitment,
  totalRepsLogged,
}: Props) {
  if (totalRepsLogged < 5) {
    return (
      <div className="rounded-2xl border bg-muted/30 px-5 py-8 text-center">
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Complete a few sessions with rest-timer feedback enabled — insights appear once
          you have at least 5 rated shots logged.
        </p>
      </div>
    );
  }

  const bestTime  = [...timeOfDay].sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))[0];
  const worstClub = byClub[0];
  const hasPreSession = preSessionCorr.length >= 2;

  return (
    <div className="space-y-8">
      {/* ── Top callout ─────────────────────────────────────────────── */}
      {(worstClub || bestTime?.avgRating) && (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-800/50 px-5 py-4 space-y-1.5">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-700 dark:text-amber-400">
            Priority actions
          </div>
          {worstClub && (
            <p className="text-sm">
              <span className="font-semibold">{worstClub.label}</span>
              {" "}is your weakest club at{" "}
              <span className={`font-semibold ${hitRateColor(worstClub.hitRate)}`}>
                {worstClub.hitRate}% hit rate
              </span>
              {" "}— practice this specifically next session.
              {(() => {
                const rec = recommendPracticeFor("club", worstClub);
                return rec ? (
                  <>
                    {" "}
                    <Link href={rec.href} className="text-primary font-medium hover:underline whitespace-nowrap">
                      {rec.label} →
                    </Link>
                  </>
                ) : null;
              })()}
            </p>
          )}
          {bestTime?.avgRating && (
            <p className="text-sm text-muted-foreground">
              You perform best in the{" "}
              <span className="font-medium text-foreground">{bestTime.label.toLowerCase()}</span>
              {" "}({bestTime.avgRating}/5 avg rating).
            </p>
          )}
        </div>
      )}

      {/* ── Clubs not practiced recently ────────────────────────────── */}
      {leastPracticed.length > 0 && (
        <div>
          <SectionHeader
            title="Neglected clubs"
            sub="Clubs in your bag not practiced in 7+ days."
          />
          <div className="space-y-2">
            {leastPracticed.map(c => (
              <div key={c.club} className="flex items-center gap-3 text-sm">
                <span className="font-medium w-28 shrink-0">{c.club}</span>
                <span className="text-muted-foreground">
                  {c.daysSinceLastSeen === 999
                    ? "Never practiced"
                    : `${c.daysSinceLastSeen} day${c.daysSinceLastSeen !== 1 ? "s" : ""} ago`}
                </span>
                {c.totalReps > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {c.totalReps} total reps
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── By Club ─────────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          title="By club"
          sub="Hit rate = shots where you executed the intended shot. Min 3 reps to appear."
        />
        <WeakSpotList
          rows={byClub}
          emptyMsg="No club data yet — use rest-timer sessions to log error corrections per shot."
          kind="club"
        />
      </div>

      {/* ── By Shape ────────────────────────────────────────────────── */}
      {byShape.length > 0 && (
        <div>
          <SectionHeader
            title="By shot shape"
            sub="Which intended shape is hardest to execute consistently."
          />
          <WeakSpotList rows={byShape} emptyMsg="" kind="shape" />
        </div>
      )}

      {/* ── By Trajectory ───────────────────────────────────────────── */}
      {byTrajectory.length > 0 && (
        <div>
          <SectionHeader
            title="By trajectory"
            sub="High / Medium / Low — which ball flight you struggle to control."
          />
          <WeakSpotList rows={byTrajectory} emptyMsg="" kind="trajectory" />
        </div>
      )}

      {/* ── Club + Shape combos ──────────────────────────────────────── */}
      {byClubShape.length > 0 && (
        <div>
          <SectionHeader
            title="Specific weak spots"
            sub="Club + shape combos with 3+ reps — your highest-value practice targets."
          />
          <WeakSpotList rows={byClubShape.slice(0, 6)} emptyMsg="" kind="club-shape" />
        </div>
      )}

      {/* ── Commitment on misses (Rule 9) ────────────────────────────── */}
      {commitment.totalMissesRated >= 3 && (
        <div>
          <SectionHeader
            title="Commitment on misses"
            sub="Rule 9 — full commitment or back off. Logged on every rated miss."
          />
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm w-28 shrink-0">Fully committed</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${commitment.committedPct}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums w-10 text-right shrink-0">
              {commitment.committedPct}%
            </span>
          </div>
          {commitment.uncommittedMisses > 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {100 - commitment.committedPct}% of your misses were commitment leaks
              {" "}({commitment.uncommittedMisses} of {commitment.totalMissesRated}) — the
              cheapest strokes to win back. Back off and re-commit before every shot.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Every rated miss came with full commitment — these are execution, not
              mental. Keep the process; the swing work is where the gains are.
            </p>
          )}
        </div>
      )}

      {/* ── Block consistency trend ──────────────────────────────────── */}
      {blockConsistency.length > 0 && (
        <div>
          <SectionHeader
            title="Block consistency"
            sub="Your self-rated consistency (1–5) across recent block sessions."
          />
          <div className="space-y-2">
            {blockConsistency.slice(-6).map((row, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{row.date}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(row.avgConsistency / 5) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums w-10 text-right shrink-0">
                  {row.avgConsistency}/5
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Time of day ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          title="Time of day"
          sub="Average shot rating by when you practice."
        />
        <div className="space-y-2">
          {timeOfDay.map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-sm w-24 shrink-0">{row.label}</span>
              {row.avgRating !== null ? (
                <>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(row.avgRating / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold tabular-nums w-14 shrink-0 text-right">
                    {row.avgRating}/5
                  </span>
                  <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">
                    {row.sessionCount} session{row.sessionCount !== 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">No data yet</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Pre-session state ─────────────────────────────────────────── */}
      {hasPreSession ? (
        <div>
          <SectionHeader
            title="Energy vs performance"
            sub="Average shot rating by your pre-session energy level."
          />
          <div className="space-y-2">
            {preSessionCorr.map(row => (
              <div key={row.energyLevel} className="flex items-center gap-3">
                <span className="text-sm w-24 shrink-0">Energy {row.energyLevel}/5</span>
                {row.avgRating !== null ? (
                  <>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${(row.avgRating / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold tabular-nums w-14 shrink-0 text-right">
                      {row.avgRating}/5
                    </span>
                    <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">
                      {row.sessionCount} session{row.sessionCount !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">No shots rated</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Energy vs performance</span>
          {" "}— rate your energy before each session to unlock this correlation.
          Starts populating after 2+ sessions with pre-session check-ins.
        </div>
      )}
    </div>
  );
}
