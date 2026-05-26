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
