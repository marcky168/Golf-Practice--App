# MEMORY.md — Decision Log

All major architectural and UX decisions, with reasoning and rejected alternatives.
Updated at the end of every session.

---

## Session — 2026-05-23

### Warm-up focus cue removed from practice phase
**Decision:** Hide the FOCUS CUE card entirely during warm-up shots (`isInWarmup` check in SessionRunner). The warm-up amber banner already provides warm-up guidance.  
**Why:** The cue was distracting during warm-up and conceptually wrong — warm-up is about tempo, not the session's technical focus cue.  
**Also fixed:** `attachWarmupToSession` in `generators.ts` was prepending a warm-up string to `config.focusCue`, so the main practice focus cue showed "Warm-up: smooth tempo… Then: [actual cue]". Removed this prepend entirely — the cue now passes through unchanged.  
**Rejected:** Showing a separate warm-up-specific cue — too much complexity for marginal gain.

### Most Practiced dashboard stat counts by title, not type
**Decision:** `app/page.tsx` now counts sessions by `session.title` instead of `session.type`.  
**Why:** `type` was always "game" or "random" — useless. Title gives the specific thing practiced (e.g. "10-Ball Challenge").  
**Label also changed:** "Most Common" → "Most Practiced".

### Mixed Session removed from dashboard
**Decision:** Removed the Mixed Session hero card (`DashboardHero.tsx`) and `RepeatLastMixedCard` from the dashboard.  
**Why:** Mixed session was the biggest card on the dashboard but completely absent from the Practice Hub — deeply inconsistent. A mixed session is conceptually just "Random Practice + warm-up", which the random sessions already support. Fewer session types = simpler UX.  
**The route `/practice/mixed` still exists** — just not surfaced.

### Drill library direct-launch (no builder detour)
**Decision:** `app/practice/drills/page.tsx` now runs sessions directly via `SessionRunner` instead of redirecting to `/practice/builder?mode=library&drill=id`.  
**Why:** The redirect was a needless two-page detour. The drills page now has a full `step` state machine (list → running → complete) identical to the builder pattern.

### Drill library filter tabs + focus cue on cards
**Decision:** Category filter tabs (All / Full Swing / Chipping / Pitching / Putting / Bunker) added internally to `BlockDrillLibraryList`. Focus cue shown on each card before starting.  
**Why:** Flat list of 10+ drills is fine now but unnavigable as the library grows. Focus cue on the card lets the user know what they're training before committing.

### Soft gate on rest-phase skip button
**Decision:** "Skip rest" button disabled until the primary error correction question is answered (either `hitIntendedShot` or `startedOnLine` depending on shot type). Timer still auto-advances freely.  
**Why:** Mandatory post-shot reflection is the point of rest-timer sessions. Gating only on skip (not on auto-advance) keeps the eyes-off cadence design intact while ensuring meaningful data collection.  
**Warmup shots exempt** — no gate during warm-up since that data doesn't feed the analysis.

### Ultradian timer consolidated into header strip
**Decision:** Removed the standalone "SESSION CLOCK" card from the running phase. Wall clock time + progress strip now live in the sticky header. Big countdown remains the primary visual.  
**Why:** Two timers on screen (session clock card + big `text-[86px]` countdown) tracked different things and confused the layout. The header strip is always visible without consuming content space.

### ErrorLogPanel: hide until first adaptation signal
**Decision:** Panel only appears when `adaptationSignals > 0` (was: `totalAnswers > 0`).  
**Added:** Coaching cue derived from most common recent signal field — tells you what to *do* next shot, not just counts.  
**Why:** A panel showing "0 signals" is noise. A panel showing counts without coaching is a scoreboard, not a tool.

### Micro-pause: fixed double-speak + minimum gap
**Decision:** Removed duplicate `speakPracticePrompt` call from the mount `useEffect` in `MicroPauseScreen`. Added `lastMicroPauseRepRef` with a 3-shot minimum gap between pauses.  
**Why (double-speak):** Mount effect and `[secondsLeft, prompt]` effect both fired at second=10 on mount, speaking "Freeze. Eyes soft." twice.  
**Why (clustering):** Pure 25% random could produce 3 consecutive pauses, killing session rhythm.

### 3-Hole Arena Test game
**Decision:** New game at `/practice/games/arena-3-hole` — Par 4 + Par 3 + Par 5 with clubs from the user's real bag. Binary hit/miss scoring (not feel rating). Error type logged on every miss. Audio cues at each moment.  
**Why:** Existing "Random 3-Hole" used feel ratings (1–5) which are too soft for transfer training. Binary hit/miss + error logging creates the frustration signal neuroplasticity requires.  
**Error types:** Wrong start line (with Left/Straight/Right direction follow-up), Wrong trajectory, Wrong distance, Poor contact.

### Miss direction captured in RestErrorCorrection
**Decision:** Added `startDirection?: "left" | "right"` and `distanceMiss?: "short" | "long"` to `RepErrorCorrection`. Direction buttons appear inline after `startedOnLine` is answered partial/no. Distance row is optional at the bottom.  
**Why:** Knowing "started off line" without knowing which direction is useless for swing diagnosis. A pull-hook and a push both answer "no" to startedOnLine but are completely different problems.

### Pre-session state rating in Practice Builder
**Decision:** `FlowStep` extended with `"pre-session"`. After clicking Start Session, user sees Energy (1–5) + Focus (1–5) rating before `SessionRunner` loads. Stored as `config.preSessionState`. Skippable.  
**Why:** Post-session reflection already existed. Pre-session rating enables the energy-vs-performance correlation on the Insights page.  
**Only added to builder** — not to every entry point. Can extend later.

### Shot Insights page at /insights
**Decision:** Server-rendered page (`app/insights/page.tsx`) aggregating up to 300 sessions. Shows weak spots by club, by shape, by club+shape combo; time-of-day performance; pre-session state correlation.  
**Discoverability:** Violet card on dashboard (appears after 3+ sessions) + "Shot Insights →" link in History trends header. Not added to BottomNav (5 items would be cramped on mobile).  
**Min reps thresholds:** Club = 3, Shape = 5, Club+Shape combo = 3.

### Game PB updates after save on same page
**Decision:** `useGamePersonalBest` returns `{ personalBest, noteSavedScore, refresh }`. All game pages save via `saveGameSession()` which calls `noteSavedScore` after a successful write so Try Again compares against the just-saved round without a full reload.  
**Also:** `savePracticeSession` uses `score: input.score ?? null` (not `||`) so a score of `0` persists. Games hub revalidated on save.

---

## Architectural invariants (never change without discussion)

- **Single table design:** All session data lives in `practice_sessions.config` (JSONB). Do not add new Supabase tables.
- **RepErrorCorrection** is the core learning-signal model. Adding fields is fine; removing or renaming breaks historical data analysis.
- **Audio must never throw.** All audio paths are wrapped in try/catch. iOS requires a user-gesture unlock before any sound plays (`unlockPracticeAudio()` must be called on the first user tap of any session).
- **Warm-up shots are exempt from error correction gating** — they exist for feel/tempo, not for data collection.
- **Session types are locked:** `"block" | "random" | "mixed" | "game" | "planned"`. Do not add new types.

---

## Session — 2026-05-26

### Program metronome now supports Tour Tempo-style cadence
**Decision:** Extended `Metronome` with two modes: `beat` (classic click every beat) and `tour-tempo` (4-step cycle with three audible tones then one silent pause). Added a mode toggle in `MetronomePanel` and set program compile blocks to default to `tour-tempo` explicitly.  
**Why:** The driver program drills repeatedly reference tempo work and the user asked for Tour Tempo-like behavior. Keeping both modes preserves backward compatibility while enabling the 3:1 training cadence where needed.  
**Also added:** Radio semantics (`radiogroup`, `role="radio"`, `aria-checked`) for metronome mode controls to improve accessibility on mobile.

### Tour Tempo mode now uses a three-tone descending loop + pause
**Decision:** Updated `Metronome.scheduleTourTempoTick` to play a three-tone descending sequence (triangle 1480Hz, square 1140Hz, sine 860Hz) followed by a silent beat pause.  
**Why:** At lower tempos in testing/practice flow, sparse cues felt broken. The 3-tone + pause loop keeps Tour Tempo feel while remaining clearly audible.

---

## Session — 2026-07-06

### Break 90 — Scoring Method program added
**Decision:** Second program in the registry: `lib/programs/break-90-program.ts` (`break-90-program`). Built from Jerome Rufin's "10 Rules to Break 90" video (coach Will's scoring method): every hole = two games — ① inside 100 yds in regulation, ② down in 3 from there. Six phases climb the Gears backwards from the green (lag putting → inside 25 → inside 50 → inside 100 → position game → integration/pressure), because "lag putting makes up for all the sins."  
**Why program, not standalone game:** The video's content is a curriculum with session-over-session target progression ("scored 8 → target 9"), which maps directly to phase gates. Registry was designed for exactly this. Phases reuse existing scored games via the new `gameId` drill link instead of duplicating drill content.  
**Rejected:** Standalone "Scoring Zone" game as the primary vehicle — no home for progression logic; would have re-implemented program features. A dedicated scoring-zone game may still come later as a Phase 5/6 benchmark.

### Program drills can now deep-link to scored games
**Decision:** Added optional `gameId?: string` to `ProgramDrill`. `ProgramSessionRunner` compile blocks render a "Play scored game →" link to `/practice/games/<gameId>`.  
**Why:** Programs prescribed games descriptively ("go play Lag Putting Ladder") with no navigation. This closes the loop cheaply.  
**Deferred:** Pulling game scores back into program gate evaluation (auto-gating off game results). Gates remain honor-system `goodPct` self-ratings for now.

### Windows-side verification of the Mac session's changes (same day, continued session)
**Verified:** `npm run typecheck` + `npm run build` pass (after clearing stale `.next` — see ERRORS.md). Browser click-through confirmed: /programs shows both programs; Break 90 overview + session runner work; compile blocks render "Play scored game →" links that resolve; Driver Program unchanged at /programs/driver-program via the dynamic route; unknown program ids render a graceful "Program not found." fallback; mobile viewport (375px) clean with no horizontal overflow or console errors. All 13 `gameId` values map to real game routes.  
**Test account created for browser verification:** `marcky168+claudetest@gmail.com` (password stored outside version control) in the dev Supabase (email-confirmed via SQL). One seed session ("Seed Data — Claude verification") inserted for that user so Insights renders. Reusable for future verification; invisible to the real account via RLS.

### Insights → "What to work on" links (build-out item 1)
**Decision:** `recommendPracticeFor(kind, row)` added to `lib/practice/insights.ts` — pure mapper from a weak-spot row to the most relevant scored game or program: Putter → Lag Putting Ladder; wedges (° / PW / GW / SW / LW) → Pitch Ladder; Driver / woods / hybrids → Driver Program; irons → 10-Ball Accuracy (or 9-Shot Flight Matrix when it's a club+shape combo); shape / trajectory rows → 9-Shot Flight Matrix. `WeakSpotsPanel` renders a "Work on this: X →" link under each weak-spot row and appends the link to the Priority Actions callout.  
**Threshold:** Per-row links only show when hitRate < 80% — no point prescribing practice for a strength; keeps the list uncluttered.  
**Rejected:** Mapping to specific Break 90 phases — phase deep-links don't exist yet (program pages show current phase only), so game links are the honest target. Revisit if phase-jumping ever ships.

### Break 90 build-out items 2–5 (continued Windows session)
All four remaining handoff items built and browser-verified on the test account. `npm run typecheck` + `npm run build` pass.

**Item 2 — Target-score chip.** `game-scores.ts` gains `GAME_SCORE_MAX`, `lastScoreFromSessions`, `nextTargetScore`. New hook `useProgramGameScores(gameIds)` (one `getUserSessions(500)` fetch covers a whole phase). `ProgramSessionRunner`'s CompileBlock renders a `GameTargetChip` next to each "Play scored game →": "Last X · Target X+1", clamped to the game ceiling ("top score — hold it" when maxed), "Set your baseline" when never played. **Decision:** anchor on *last* score (the video's "scored 8 → target 9"), not personal best.

**Item 4 — Commitment signal (Rule 9).** `committed?: boolean` added to `RepErrorCorrection` (both `lib/practice/types.ts` and the mirror in `RestErrorCorrection.tsx` — additive). A binary "On that miss — were you 10/10 committed?" (Yes fully in / No I bailed) shows only when the primary answer is a miss (no/partial); cleared when the primary flips back to "yes". `computeCommitmentStat` in insights.ts + a "Commitment on misses" section in WeakSpotsPanel showing committed% and the commitment-leak coaching line (shows at ≥3 rated misses). **Why kept distinct from `focusCueMatch`:** focusCue = did you execute the technical cue; committed = were you mentally 100% in. The video treats commitment as the master variable.

**Item 5 — Per-phase warmup override.** Optional `warmup?: ProgramWarmup` on `ProgramPhase`; runner uses `phase.warmup ?? program.warmup`. Break 90 phases 5 & 6 (full shots off the tee) get a shared `FULL_SWING_WARMUP` (T-spine/hip mobility → wedge-to-driver ramp-up → routine rehearsal). Overview warm-up card relabeled "Default warm-up" with a note when any phase overrides.

**Item 3 — Game-score pull-back into gates (the "discuss first" item).** `PhaseGate.gameGate?: { gameId; targetScore; requiredSessions }`. **Key design decision — alternative satisfier, NOT replacement:** `gateMet = honorSystemGate || gameGateMet`. Deviates from the handoff's "instead of honor-system" wording on purpose — replacing outright could *stuck* a user who does the drills without opening the scored game, which fights the app's honor-system spirit; an alternative path can only ever advance, never block. Targets set at matched stringency (honor-gate % × game max): lag-putting-ladder 48/60, up-and-down 4/6, pitch-ladder 42/60, wedge-window-6 4/6, arena-3-hole 4/6 — all 2 rounds. Phase 6 stays open-ended (no gameGate). `computeProgramProgress` now also evaluates the phase-0 gameGate in the zero-logs branch (see ERRORS.md), and both program page `select`s widened to include `type, score`. Overview gate text shows the game path ("or 2 rounds of Lag Putting Ladder scoring 48+").

**Test-account seed data added** (marcky168+claudetest@gmail.com, RLS-isolated): 2 lag-putting-ladder game rounds (48, 50 — enough to trip phase 1's gameGate) and a "Seed — commitment reps" block session (3 committed / 2 leaked misses). Reusable for future verification.

### Program routes converted to dynamic `[programId]`
**Decision:** Replaced hardcoded `app/programs/driver-program/` (overview + session pages) with `app/programs/[programId]/` equivalents. Pages read `params.programId` and use `getProgramById`.  
**Why:** The programs hub already linked to `/programs/${program.id}` for every registered program, but only `driver-program` had pages — any second program 404'd. The registry's "no UI changes needed" promise is now actually true.

---

## Session — 2026-07-07

### Sprint 1 — real-world reliability fixes for the program session runner
Bug-hunt + hardening pass ahead of live range testing. All changes in `ProgramSessionRunner.tsx`, `lib/programs/progress.ts`, `lib/programs/types.ts`, `app/programs/[programId]/page.tsx`, `useProgramGameScores.ts`. `npm run typecheck` + `npm run build` pass.

**Wall-clock countdown timer (the load-bearing fix).** `useCountdown` now derives remaining seconds from a fixed `endAt = Date.now() + initialSeconds*1000` timestamp instead of decrementing state, plus a `visibilitychange` re-sync. **Why:** iOS Safari suspends JS timers on screen-lock/backgrounding — which is *exactly* the eyes-closed micro-rest (3 min) and consolidate (5–10 min) phases. The old `setInterval` decrement froze while locked, so the "continue" button stayed disabled after unlock. See ERRORS.md.

**Save resilience.** `handleSave` wrapped in try/catch/finally. `savePracticeSession` returns `{error}` on Supabase errors but *throws* on network failure (range Wi-Fi/cellular drops) — the old code had no catch, so `setSaving(false)` never ran and the button stuck at "Saving…" forever, losing the tracking-sheet entry with no retry. `finally` always re-enables; a catch shows a connection-specific toast.

**Practice-mode phase protection.** Added `practiceMode?: boolean` to `ProgramSessionLog`; `handleSave` tags logs run via `?phase=` override. `programSessions()` in progress.ts now excludes practice logs entirely from phase determination. **Why:** current phase = latest log's phase, so revisiting Phase 1 via the practice override and saving *regressed* a Phase-4 user back to Phase 1 — directly contradicting the intro banner's "won't change your phase" promise. Backward-compatible: pre-existing logs have no flag → `!undefined` → still counted.

**Input clamp + lock-icon logic.** Tracking sheet clamps `goodShots ≤ totalShots` (was allowing 12/10 = 120% goodPct, which satisfied gates and polluted the score column); save also clamps defensively. Overview phase timeline: `isLocked` was `i > currentPhaseIndex && !nextPhaseUnlocked`, which un-locked *every* future phase once a gate was met — fixed to `i > currentPhaseIndex + (nextPhaseUnlocked ? 1 : 0)` so only the next phase unlocks. `idleRestDone` check now set explicitly (was `toggleCheck`, so re-entering consolidate via the step-picker flipped it back off). `useProgramGameScores` fetch gained a `.catch` so an offline range drop degrades to "Set your baseline" instead of an unhandled rejection.

**Rejected / deferred:** Offline save-queue (Sprint 2) not built yet — biggest remaining reliability gap for range use. `limit(200/500)` session windows on the program pages could eventually drop old passing game rounds out of gate evaluation; left as-is (deferred to a server-side filtered query). Verification of the two UI-visual fixes (clamp, lock icons) blocked by the preview harness not persisting Supabase auth cookies on `http://localhost` — relied on typecheck + full build (both program routes compiled clean) instead.

---

## Session — 2026-07-08

### World-class UX polish — Programs discoverability + calm Home IA
**Decision:** Treat Break 90 / Programs as a first-class product surface, not a hardcoded Driver card. Added `lib/programs/dashboard.ts` (`getPrimaryProgramCard`, `describeGateProgress`, `recommendedGameIdsForActivePrograms`) and `ContinueProgramCard` so Home shows the *active* program + phase + plain-English gate bar.  
**Home IA:** One primary next action (Continue program → Suggested focus with real deep-link → Repeat last), then secondary Programs entry, compact stats (no rainbow left-borders), Insights tertiary.  
**Discoverability:** Programs promo card in `SkillFirstPicker` (hero + Practice hub); Programs hub shows per-program phase progress; Games hub surfaces “For your current program” game links from the active phase’s `gameId` drills.  
**Program overview:** Cue + Start + gate bar above the fold; warm-up / good-shot / schedule / about collapsed via `ProgramDetailsAccordion`; testing panel moved below the fold and visually demoted.  
**Session chrome:** `useSessionImmersive` + `html.session-immersive` hides AppHeader + BottomNav during `SessionRunner` / `ProgramSessionRunner`.  
**Microcopy:** Commitment row coaching lines on bail vs fully-in; cue cards get stronger typography/gradient. Games cards demote difficulty badges and lead with “Why it helps” + PB.  
**Rejected:** Adding Programs to BottomNav (5th item cramped on mobile); offline save queue still deferred; full Scoring Zone game still deferred (program remains the vehicle).
