"use client";

import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateSessionNotes } from "@/app/actions";
import { getSessionDurationMinutes } from "@/lib/practice/session-duration";
import { summarizeErrorCorrection, correctionLabel } from "@/lib/practice/trends";
import type { RepErrorCorrection, RepRecordSnapshot } from "@/lib/practice/types";
import { toast } from "sonner";
import { format } from "date-fns";

// ─── helpers ─────────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground tracking-widest mb-3 uppercase">{title}</h4>
      <div className="bg-muted/30 rounded-xl p-4">{children}</div>
    </div>
  );
}

// ─── game-specific renderers ─────────────────────────────────────────────────

function TenBallResults({ cfg, score }: { cfg: any; score: number | null }) {
  const result = cfg?.result;
  const records: any[] = cfg?.records ?? [];
  const scoreLabels: Record<number, string> = { 5: "Bullseye", 4: "Inner Ring", 3: "Outer Ring", 1: "On Green", 0: "Miss" };
  const colors: Record<number, string> = {
    5: "bg-emerald-600", 4: "bg-emerald-400", 3: "bg-yellow-400", 1: "bg-orange-400", 0: "bg-red-500"
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-accent tabular-nums">{result?.total ?? score ?? "—"}<span className="text-base text-muted-foreground">/50</span></div>
          <div className="text-xs text-muted-foreground">{result?.percentage ?? "—"}% accuracy</div>
        </div>
        <div className="bg-card border rounded-xl p-3 space-y-1 text-sm">
          <div><span className="text-muted-foreground">Club: </span><span className="font-medium">{cfg?.club ?? "—"}</span></div>
          <div><span className="text-muted-foreground">Target: </span><span className="font-medium">{cfg?.target ?? "—"}</span></div>
        </div>
      </div>
      {records.length > 0 && records[0]?.shape && (
        <div className="text-sm text-center text-primary font-medium">
          {records[0].shape} · {records[0].trajectory}
        </div>
      )}
      {result?.breakdown && (
        <div className="space-y-1">
          {([5, 4, 3, 1, 0] as const).map(s => {
            const count = result.breakdown[s] ?? 0;
            if (count === 0) return null;
            return (
              <div key={s} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-24">{scoreLabels[s]}</span>
                <div className="flex gap-0.5 flex-1">
                  {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className={`h-2 flex-1 rounded-full ${colors[s]}`} />
                  ))}
                  {Array.from({ length: 10 - count }).map((_, i) => (
                    <div key={i} className="h-2 flex-1 rounded-full bg-muted" />
                  ))}
                </div>
                <span className="font-semibold w-4 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pressure5Results({ cfg, score }: { cfg: any; score: number | null }) {
  const shotLog: any[] = cfg?.shotLog ?? [];
  const level = cfg?.level ?? 5;
  const completed = score != null && score >= level;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-card border rounded-xl p-3">
          <div className="text-2xl font-bold tabular-nums text-orange-500">{cfg?.bestStreak ?? score ?? "—"}</div>
          <div className="text-xs text-muted-foreground">Best streak</div>
        </div>
        <div className="bg-card border rounded-xl p-3">
          <div className="text-2xl font-bold tabular-nums">{level}</div>
          <div className="text-xs text-muted-foreground">Target</div>
        </div>
        <div className="bg-card border rounded-xl p-3">
          <div className="text-2xl font-bold tabular-nums">{cfg?.totalAttempts ?? "—"}</div>
          <div className="text-xs text-muted-foreground">Total shots</div>
        </div>
      </div>
      {completed && (
        <div className="text-center text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-xl py-2">
          {"🔥".repeat(Math.ceil(level / 5))} Completed {level}-in-a-Row ✓
        </div>
      )}
      {shotLog.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {shotLog.map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground w-5">{i + 1}.</span>
              <span className="flex-1 font-medium">{s.club}</span>
              <span className="text-muted-foreground">{s.shape} · {s.trajectory}</span>
              <span className={`ml-2 px-1.5 py-0.5 rounded-full font-semibold ${s.hit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                {s.hit ? "HIT" : "MISS"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MatrixResults({ cfg, score }: { cfg: any; score: number | null }) {
  const results = cfg?.results ?? {};
  const heights = ["High", "Mid", "Low"];
  const shapes  = ["Draw", "Straight", "Fade"];
  const successCount = Object.values(results).filter(r => r === "success").length;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{score ?? successCount}<span className="text-base text-muted-foreground">/9</span></div>
          <div className="text-xs text-muted-foreground">Successful combos</div>
        </div>
        <div className="bg-card border rounded-xl p-3 text-center">
          <div className="text-lg font-semibold">{cfg?.club ?? "—"}</div>
          <div className="text-xs text-muted-foreground">Club used</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 text-xs">
        <div />
        {shapes.map(s => <div key={s} className="text-center font-medium text-muted-foreground">{s}</div>)}
        {heights.map(h => (
          <Fragment key={h}>
            <div className="text-muted-foreground font-medium flex items-center">{h}</div>
            {shapes.map(s => {
              const v = results[`${h}-${s}`];
              return (
                <div key={`${h}-${s}`} className={`h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                  v === "success" ? "bg-emerald-500 text-white" : v === "miss" ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
                }`}>{v === "success" ? "✓" : v === "miss" ? "✗" : "—"}</div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function UpDownResults({ cfg, score }: { cfg: any; score: number | null }) {
  const results: any[] = cfg?.results ?? [];
  const made = results.filter(r => r.upAndDown).length;
  return (
    <div className="space-y-3">
      <div className="text-center py-3 bg-card border rounded-xl">
        <div className="text-3xl font-bold text-emerald-600">{score ?? made}<span className="text-xl text-muted-foreground">/6</span></div>
        <div className="text-sm text-muted-foreground">up & downs made</div>
      </div>
      {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <span>{r.lie}</span>
                {r.shape && <span className="text-xs text-muted-foreground ml-2">{r.shape} · {r.trajectory}</span>}
              </div>
              <span className={`font-medium ${r.upAndDown ? "text-emerald-600" : "text-red-500"}`}>
                {r.upAndDown ? "Made" : "Missed"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LagResults({ cfg, score }: { cfg: any; score: number | null }) {
  const results: number[][] = cfg?.results ?? [[], [], [], []];
  const distances = ["8 ft", "15 ft", "25 ft", "40 ft"];
  return (
    <div className="space-y-3">
      <div className="text-center py-3 bg-card border rounded-xl">
        <div className="text-3xl font-bold text-accent tabular-nums">{score ?? "—"}<span className="text-lg text-muted-foreground">/60</span></div>
        <div className="text-sm text-muted-foreground">total points</div>
      </div>
      <div className="space-y-1">
        {distances.map((d, i) => {
          const balls = results[i] ?? [];
          const distScore = balls.reduce((a: number, b: number) => a + b, 0);
          return (
            <div key={d} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{d}</span>
              <div className="flex gap-1">
                {balls.map((b: number, j: number) => (
                  <span key={j} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    b === 5 ? "bg-emerald-500 text-white" : b === 3 ? "bg-blue-400 text-white" : b === 1 ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground"
                  }`}>{b}</span>
                ))}
              </div>
              <span className="font-semibold w-10 text-right">{distScore}/15</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Random9Results({ cfg, score }: { cfg: any; score: number | null }) {
  const entries: any[] = cfg?.shotEntries ?? cfg?.drills?.map((d: any, i: number) => ({ drill: d, rating: cfg?.ratings?.[i] })) ?? [];
  const avg = entries.length > 0 ? (entries.reduce((a, e) => a + (e.rating ?? 0), 0) / entries.length).toFixed(1) : "—";
  return (
    <div className="space-y-3">
      <div className="text-center py-3 bg-card border rounded-xl">
        <div className="text-3xl font-bold text-accent">{avg}<span className="text-lg text-muted-foreground">/5</span></div>
        <div className="text-sm text-muted-foreground">average feel</div>
      </div>
      {entries.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {entries.map((e: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="min-w-0 flex-1">
                <span className="font-medium">{e.drill?.club ?? "—"} — {e.drill?.distance ?? "—"}</span>
                {e.shape && <span className="text-xs text-muted-foreground ml-2">{e.shape} · {e.trajectory}</span>}
              </div>
              <span className="ml-2 font-semibold shrink-0">{e.rating}/5</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PracticeDetails({ cfg }: { cfg: any }) {
  const drills: any[] = cfg?.drills ?? [];
  const areas: string[] = cfg?.focusAreas ?? [];
  return (
    <div className="space-y-1 text-sm">
      {areas.length > 0 && (
        <Row label="Focus areas" value={areas.map((a: string) => a.replace("-", " ")).join(", ")} />
      )}
      {drills.length > 0 && (
        <Row label="Shots / reps" value={drills.length} />
      )}
      {cfg?.focusCue && (
        <Row label="Focus cue" value={<span className="italic">&ldquo;{cfg.focusCue}&rdquo;</span>} />
      )}
    </div>
  );
}

function CorrectionBar({
  totals,
}: {
  totals: { yes: number; partial: number; no: number };
}) {
  const total = totals.yes + totals.partial + totals.no;
  if (total === 0) return null;
  const yesPct = (totals.yes / total) * 100;
  const partialPct = (totals.partial / total) * 100;
  const noPct = (totals.no / total) * 100;
  return (
    <div className="flex h-2 rounded-full overflow-hidden bg-muted">
      {yesPct > 0 && <div className="bg-emerald-500" style={{ width: `${yesPct}%` }} />}
      {partialPct > 0 && <div className="bg-amber-400" style={{ width: `${partialPct}%` }} />}
      {noPct > 0 && <div className="bg-red-500" style={{ width: `${noPct}%` }} />}
    </div>
  );
}

function ErrorCorrectionDetails({ reps }: { reps: RepRecordSnapshot[] }) {
  const summary = summarizeErrorCorrection(reps);
  if (summary.totalAnswered === 0) return null;

  const rows: Array<{ key: keyof RepErrorCorrection; totals: { yes: number; partial: number; no: number } }> = [];
  (["startedOnLine", "trajectoryMatch", "hitIntendedShot", "focusCueMatch"] as const).forEach(key => {
    const totals = summary[key];
    if (totals) rows.push({ key, totals });
  });

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Honest taps from the rest screen across {summary.totalAnswered} shot{summary.totalAnswered === 1 ? "" : "s"}.
      </p>
      {rows.map(({ key, totals }) => {
        const total = totals.yes + totals.partial + totals.no;
        return (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium">{correctionLabel(key)}</span>
              <span className="text-muted-foreground tabular-nums">
                {totals.yes}·{totals.partial}·{totals.no} <span className="opacity-60">/ {total}</span>
              </span>
            </div>
            <CorrectionBar totals={totals} />
          </div>
        );
      })}
      <div className="flex gap-3 text-[10px] text-muted-foreground pt-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Yes</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Partial</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> No</span>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props { session: any }

export function HistorySessionDetail({ session }: Props) {
  const [notes, setNotes] = useState(session.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const config = session.config || {};
  const reflection = session.reflection || {};
  const gameId = config.gameId as string | undefined;

  async function handleSaveNotes() {
    setIsSaving(true);
    const res = await updateSessionNotes(session.id, notes);
    setIsSaving(false);
    if (res.success) { toast.success("Notes saved"); setOpen(false); }
    else toast.error("Failed to save notes");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Details</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl pr-8 leading-snug">{session.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(new Date(session.started_at), "EEEE, MMM d yyyy · h:mm a")}
          </p>
        </DialogHeader>

        <div className="space-y-6 py-2">

          {/* Overview row */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-0.5">Duration</div>
              <div className="font-semibold">{getSessionDurationMinutes(session) || "—"} min</div>
            </div>
            <div className="bg-muted/40 rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-0.5">Type</div>
              <div className="font-semibold capitalize">{session.type}</div>
            </div>
            {session.overall_feel != null && (
              <div className="bg-muted/40 rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-0.5">Overall Feel</div>
                <div className="font-semibold">{session.overall_feel}/5</div>
              </div>
            )}
            {session.score != null && (
              <div className="bg-muted/40 rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-0.5">Score</div>
                <div className="font-semibold text-accent">{session.score}</div>
              </div>
            )}
          </div>

          {/* Game / practice results */}
          {session.type === "game" && gameId && (
            <Section title="Game Results">
              {gameId === "10-ball-accuracy"   && <TenBallResults cfg={config} score={session.score} />}
              {gameId === "pressure-5"         && <Pressure5Results cfg={config} score={session.score} />}
              {gameId === "9-shot-matrix"      && <MatrixResults cfg={config} score={session.score} />}
              {gameId === "up-and-down"        && <UpDownResults cfg={config} score={session.score} />}
              {gameId === "lag-putting-ladder" && <LagResults cfg={config} score={session.score} />}
              {gameId === "random-9"           && <Random9Results cfg={config} score={session.score} />}
            </Section>
          )}

          {(session.type === "block" || session.type === "random" || session.type === "mixed") && (
            <>
              <Section title="Session Details">
                <PracticeDetails cfg={config} />
              </Section>
              {Array.isArray(config?.repRecords) && config.repRecords.length > 0 && (
                <Section title="Error Correction Patterns">
                  <ErrorCorrectionDetails reps={config.repRecords as RepRecordSnapshot[]} />
                </Section>
              )}
            </>
          )}

          {/* Reflection */}
          {(reflection.well || reflection.improve || reflection.energy || reflection.focus) && (
            <Section title="Reflection">
              <div className="space-y-2 text-sm">
                {reflection.well     && <div><span className="font-medium">What went well: </span>{reflection.well}</div>}
                {reflection.improve  && <div><span className="font-medium">To improve: </span>{reflection.improve}</div>}
                {(reflection.energy || reflection.focus) && (
                  <div className="flex gap-4 text-muted-foreground text-xs pt-1">
                    {reflection.energy && <span>Energy {reflection.energy}/5</span>}
                    {reflection.focus  && <span>Focus {reflection.focus}/5</span>}
                    {reflection.replayDone && <span className="text-emerald-600 font-medium">Neural replay ✓</span>}
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Notes */}
          <Section title="Notes">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full min-h-[100px] bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/50"
              placeholder="Add any extra thoughts about this session…"
            />
            <Button onClick={handleSaveNotes} disabled={isSaving} size="sm" className="mt-2">
              {isSaving ? "Saving…" : "Save Notes"}
            </Button>
          </Section>

        </div>
      </DialogContent>
    </Dialog>
  );
}
