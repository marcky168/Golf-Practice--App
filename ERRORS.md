# ERRORS.md — Failure Log

Every bug, incorrect assumption, and failed approach — with the exact lesson learned.
Updated at the end of every session.

---

## Session — 2026-05-23

### Warm-up focus cue prepended to main cue
**Bug:** `attachWarmupToSession` in `generators.ts` was overwriting `config.focusCue` with:
```
"Warm-up: smooth tempo… Then: <actual cue>"
```
So during the main practice phase, the focus cue card showed the warm-up instruction prefix even though warm-up was over.  
**Root cause:** The function was designed to set a single unified cue for the whole session, but the UI later separated warm-up and practice phases visually. The cue no longer needed to carry warm-up instructions — the amber banner does that.  
**Fix:** Removed the `focusCue` override from `attachWarmupToSession` entirely. The original `config.focusCue` now passes through unchanged.  
**Lesson:** When UI gains phase awareness (warm-up vs practice), revisit any data fields that were compensating for the absence of that awareness.

### Micro-pause spoke first prompt twice
**Bug:** `MicroPauseScreen` had two `useEffect` calls that both fired on mount:
1. Mount effect: `speakPracticePrompt(microPausePromptForSecond(MICRO_PAUSE_SECONDS))` — speaks "Freeze. Eyes soft."
2. `[secondsLeft, prompt]` effect: also fires on mount with `secondsLeft = 10`, `prompt = "Freeze. Eyes soft."` — speaks it again.  
**Fix:** Removed the `speakPracticePrompt` call from the mount effect. Only `playMicroPauseStartSound()` remains there. The `[secondsLeft, prompt]` effect handles all speech correctly.  
**Lesson:** When two effects share a dependency value at mount time, check for double-execution. The mount effect and a `[dep]` effect both run on first render with the same dep value.

### Micro-pause clustering (back-to-back pauses)
**Bug:** Pure 25% random probability meant 3 consecutive micro-pauses were possible, disrupting session flow completely.  
**Fix:** Added `lastMicroPauseRepRef` tracking the rep index when the last pause fired. New pause requires `currentIndex - lastMicroPauseRepRef.current >= 3`.  
**Lesson:** Random events with meaningful UX impact need a minimum cooldown, not just a probability. Probability alone doesn't prevent clustering.

### Two timers on screen tracking different things
**Bug:** Running phase showed both:
- A "SESSION CLOCK" card with `formatSessionClock(sessionWallElapsed)` (real wall clock since session started)
- A large `text-[86px]` countdown showing `displayTime` (configured session duration countdown)  
These tracked different things and appeared in the same vertical flow, making the screen cluttered and confusing.  
**Fix:** Removed the SESSION CLOCK card. Moved wall clock + ultradian progress strip to the sticky header. The big countdown remains as the primary visual.  
**Lesson:** Two metrics tracking time on the same screen need to be clearly differentiated in size/placement, or one should be removed. When in doubt, keep the one the user directly controls (the configured countdown).

### Mixed session visible on dashboard, invisible in practice hub
**Bug:** Mixed session was the *largest* card on the dashboard (full-width hero, labeled "Recommended") but *completely absent* from the Practice Hub at `/practice`. Users navigating via the hub had no way to find it.  
**Root cause:** The dashboard and the hub were updated independently, and mixed session was added only to `DashboardHero`.  
**Fix:** Removed mixed session from the dashboard entirely rather than adding it to the hub. A mixed session is just "Random Practice + warm-up" — the random sessions already do this.  
**Lesson:** If a feature exists in one navigation entry point, it must exist in all of them, or not at all. Inconsistent discoverability is worse than absence.

### `mostCommonType` showed "game" instead of specific session
**Bug:** Dashboard "Most Common" stat counted by `session.type` (which was always one of 5 generic strings like "game", "random"). Every game session just showed "game" instead of "10-Ball Challenge" etc.  
**Fix:** Changed to count by `session.title` — the specific session name.  
**Lesson:** Generic type fields are useful for filtering/routing, not for human-readable "most used" displays. Always check what the data actually looks like before assuming a field is meaningful for display.

### Drill library page routed through Practice Builder
**Bug:** The standalone Drill Library page (`/practice/drills`) called `router.push('/practice/builder?mode=library&drill=id')` on "Load & Start" — sending the user to a completely different page just to start a session they'd already selected.  
**Root cause:** The drills page was built before the pattern of embedding `SessionRunner` directly into page-level components was established. It delegated session running to the builder rather than owning the flow.  
**Fix:** Rewrote the drills page with a `step` state machine (list → running → complete) identical to the builder pattern.  
**Lesson:** When a page is a selection UI for something the user will then *do*, the page should own the doing — not redirect to another page's wizard.

### Game personal best reset after Save + Try Again
**Bug:** Finish game → Save Session → Try Again → second completion still showed "First attempt" with no personal best.  
**Root cause:** `useGamePersonalBest` only fetched history once on mount; saving on the same page never updated in-memory PB state. Secondary: `score: input.score || null` dropped legitimate zero scores.  
**Fix:** `noteSavedScore()` merges saved score into hook state after successful save; `saveGameSession()` wrapper used by all PB-tracked games.  
**Follow-up:** `GameScoreCompare` freezes beat/tie/miss at completion so saving a new PB does not flip the banner to "tied".  
**Lesson:** Any client-side "best so far" display must update optimistically after writes when the user can replay without navigating away. Separate "comparison baseline" from "live all-time best" when save updates the latter.

---

## Standing rules derived from errors above

1. **Always check for double-firing on `useEffect` with `[dep]` arrays** — mount and dep-change both fire on first render with the same values.
2. **Random events with UX consequences need minimum gaps** — not just probability caps.
3. **Navigation consistency check before shipping any new feature** — if it appears in one nav entry point, it must appear in all relevant ones.
4. **Use session title (not type) for human-readable "most used" displays.**
5. **When a UI gains phase awareness, audit any data fields that were compensating for the lack of it.**

---

## Session — 2026-05-26

### `npm run lint` currently fails because `next lint` is not valid in this setup
**Bug:** Running `npm run lint` fails with:
```
Invalid project directory provided, no such directory: /home/runner/work/Golf-Practice--App/Golf-Practice--App/lint
```
**Root cause:** The project is on Next.js 16 where invoking `next lint` via this script path currently resolves incorrectly in this environment.  
**Workaround used in this session:** Relied on `npm run typecheck` and `npm run build` for validation while recording lint failure as pre-existing tooling/config behavior.  
**Lesson:** Keep lint command compatibility aligned with the current Next.js major version before depending on it as a required validation gate.

### Tour Tempo sounded "dead" at low BPM in testing flow
**Bug:** Users reported no audible metronome in Driver Program testing/practice tools even though the metronome was wired correctly.  
**Root cause:** Tour Tempo mode intentionally emitted sounds only on beats 1 and 4; at low BPM this created long silent spans that felt like no output.  
**Fix:** Switched to a clear three-tone descending sequence on beats 1–3 followed by a deliberate pause beat, and added explicit Tour Tempo preset settings (`18/6`, `21/7`, `24/8`, `27/9`, `30/10`).  
**Lesson:** For tempo tools used on mobile and outdoors, explicit rhythmic phrasing (tone-tone-tone-pause) is clearer than sparse accent-only cues.

---

## Session — 2026-07-06

### Second program in registry would have 404'd
**Bug:** `lib/programs/registry.ts` claimed "Adding a program = new file + add to array. No UI changes needed." False: the hub (`app/programs/page.tsx`) linked to `/programs/${program.id}` dynamically, but the overview and session pages were hardcoded at `app/programs/driver-program/` with `const PROGRAM_ID = "driver-program"`. Adding `break-90-program` to the registry produced a hub card linking to a 404.  
**Fix:** Converted to a dynamic route `app/programs/[programId]/` (+ `/session`) reading the id from `params`; deleted the hardcoded directory.  
**Lesson:** When a registry/comment promises "no UI changes needed to add entries," add a second entry and click through it before trusting the claim — single-entry registries hide hardcoded routes.

### Stale `.next` types broke typecheck after deleting a route directory
**Bug:** After the Mac session deleted `app/programs/driver-program/`, `npm run typecheck` on Windows failed with `TS2307: Cannot find module '../../../app/programs/driver-program/page.js'` from `.next/dev/types/validator.ts`.  
**Root cause:** Next.js dev-generated route types in `.next` still referenced the deleted pages; `tsc --noEmit` includes them.  
**Fix:** `Remove-Item -Recurse -Force .next` then re-run. Build regenerates everything.  
**Lesson:** After deleting or renaming route directories, clear `.next` before trusting typecheck results.

### Supabase sign-up rejects `example.com` emails
**Issue:** Creating a browser-verification account with `claude-test@example.com` failed with "Email address is invalid" — Supabase blocks known-fake domains.  
**Fix:** Used plus-addressing on the real inbox (`marcky168+claudetest@gmail.com`), then confirmed the email via SQL (`update auth.users set email_confirmed_at = now()`) since no one can click the confirmation link mid-verification.  
**Lesson:** For dev-account seeding, plus-address the owner's real email and confirm via SQL through the Supabase MCP.

### `computeProgramProgress` early-return skipped the new gameGate check
**Bug:** After adding `gameGate` evaluation to `computeProgramProgress`, phase 1 never unlocked from game scores. The function early-returns a hardcoded `gateMet: false` when there are zero program-session logs — and the whole point of a gameGate is that a user might satisfy it with scored-game rounds *before* logging any program session. My gameGate check sat after that early return, so it was dead in exactly the case it's meant for.
**Fix:** The zero-logs branch now evaluates `program.phases[0].gate.gameGate` before returning. Verified in-browser: 2 lag-putting-ladder rounds ≥48 with 0 program sessions → phase 2 shows "Unlocked" and the session page resolves to Phase 2.
**Lesson:** When adding an alternative data source to a function, check every early-return/short-circuit path — the "empty" branch is often exactly where the alternative source is the only signal available.

### Timed rest-phase auto-advances during browser verification
**Issue:** Verifying the Rule-9 commitment row meant driving a random session to the rest phase and answering a miss. With a 15-sec rest timer, doing "mark shot" and "answer No" as two separate tool round-trips let the timer expire and auto-advance to the next shot before the second call landed.
**Fix:** Chain the whole interaction (mark → wait 500ms → click primary "No" → wait → assert commitment row) inside a single `preview_eval` Promise so it completes within the rest window.
**Lesson:** For time-boxed UI states, script the full interaction in one eval rather than across round-trips.

### No Node.js on the Mac side of this OneDrive-synced project
**Issue:** `node`, `npm`, `npx` are not installed on this Mac; `node_modules/.bin` contains Windows `.cmd`/`.ps1` shims — the toolchain lives on the Windows machine. `npm run typecheck` could not be run for this session's changes.  
**Workaround:** Manual review of new files against `lib/programs/types.ts`; all 12 `gameId` values verified against `app/practice/games/` directory names.  
**Lesson:** Changes made on the Mac must be validated with `npm run typecheck` + `npm run build` on the Windows machine before shipping.

---

## Session — 2026-07-07

### Program rest timers froze on iOS screen-lock (silent, would have failed in the field)
**Bug:** `useCountdown` in `ProgramSessionRunner.tsx` used `setInterval` to decrement a `secondsLeft` state value by 1 each tick. iOS Safari suspends JS timers when the screen locks or the tab is backgrounded — and the micro-rest (3 min) and consolidate (5–10 min) phases explicitly tell the user to put the phone down / close their eyes. On unlock, the countdown had barely moved and the "continue" button was still `disabled`, stranding the user.  
**Root cause:** State-decrement timers assume the tab stays foregrounded and the event loop keeps firing. Neither holds on a locked phone.  
**Fix:** Derive remaining time from a wall-clock `endAt` timestamp captured once when the timer starts; recompute on each tick AND on `visibilitychange` so it snaps to the correct value the instant the phone is unlocked.  
**Lesson:** Any countdown a user is told to walk away from must be wall-clock based, never interval-decrement. Timers that outlive a screen-lock cannot live in React state deltas.

### `savePracticeSession` throw on network failure left the save button stuck forever
**Bug:** `handleSave` awaited `savePracticeSession` with no try/catch. The action returns `{error}` for Supabase-level errors, but a genuine network failure (dropped range Wi-Fi/cellular) *throws*. The throw skipped `setSaving(false)`, so the button stayed disabled at "Saving…" permanently and the tracking-sheet entry was lost with no retry path.  
**Fix:** try/catch/finally — `finally` always clears `saving`; catch shows a connection-specific toast; the button re-enables for retry.  
**Lesson:** A server action that can throw needs a `finally` to release any "in-flight" UI lock. `res.success ? … : …` only covers the *returned-error* path, not the *thrown* path.

### Practice-mode program sessions silently regressed the user's phase
**Bug:** Starting a session via the `?phase=` practice/testing override and saving it wrote a normal `programLog` for that phase. Since `computeProgramProgress` defines "current phase = latest log's phase," saving a Phase-1 practice run moved a Phase-4 user back to Phase 1 — the exact opposite of the intro banner's "this session won't change your phase" promise.  
**Fix:** `practiceMode?: boolean` added to `ProgramSessionLog`, set in `handleSave` from the `practiceMode` prop; `programSessions()` filters practice logs out of all progression logic. Backward-compatible (`!undefined` → old logs still count).  
**Lesson:** When a UI promises "this won't affect your progress," the persisted record must carry a flag the progress calculator actually honors — a reassuring banner with no data backing is a lie the code tells.

### Gate/lock display bugs found alongside
**Bugs:** (1) `goodShots` input accepted values above `totalShots` → >100% goodPct that satisfied gates and polluted `score`. (2) Overview `isLocked = i > currentPhaseIndex && !nextPhaseUnlocked` un-locked *every* downstream phase once a gate was met, not just the next one. (3) `idleRestDone` set via `toggleCheck`, so re-entering the consolidate step via the step-picker flipped it back off.  
**Fixes:** Clamp both shot inputs (and defensively at save); `isLocked = i > currentPhaseIndex + (nextPhaseUnlocked ? 1 : 0)`; explicit `setChecks(... idleRestDone: true)`.  
**Lesson:** Numeric inputs that feed a ratio/gate need a clamp at entry; "unlock the next step" logic must add exactly 1, not flip a global boolean; use toggles only for genuinely user-toggled state, setters for one-way completion flags.

### Preview harness will not hold a Supabase session on `http://localhost`
**Issue:** Verifying the two UI-visual fixes (input clamp, phase lock icons) required an authenticated program page. The preview browser reached Supabase (sign-in recorded server-side, `last_sign_in_at` updated) but never persisted the `sb-*` auth cookies, so every authed route bounced back to `/login`. Credentials were correct (confirmed via SQL on project `ahrqubudkllkseiphhgs`).  
**Workaround:** Fell back to `npm run typecheck` + full `npm run build` (both `/programs/[programId]` routes compiled clean) for verification of type/route correctness; UI-pixel confirmation deferred to the real device.  
**Lesson:** The preview harness can't complete cookie-based auth flows on localhost. For auth-gated UI, verify via typecheck/build and reason about the render, or test on the real logged-in device — don't burn round-trips re-attempting the login.

---

## Session — 2026-07-08

### Dashboard Programs card still said "Driver Program" after Break 90 shipped
**Bug / UX debt:** Home linked to `/programs` but the card title/subtitle were hardcoded to Driver Program + TPI copy, so Break 90 was invisible from the primary surface.  
**Root cause:** Card was written when only one program existed and never updated when the registry grew.  
**Fix:** Dynamic `ContinueProgramCard` driven by `getPrimaryProgramCard` / progress helpers.  
**Lesson:** Any UI that names a registry entry must read the registry (or progress), never hardcode the first product’s marketing line.

### Suggested Focus linked to generic `/practice/block`
**Bug:** Weak-spot CTA ignored `recommendPracticeFor` and always sent users to block practice, even when Insights already knew the right game/program.  
**Fix:** Use `recommendPracticeFor` for the href + label when hit rate &lt; 80%.  
**Lesson:** If a pure mapper already exists for “what to work on,” the dashboard CTA must use it — don’t invent a second, dumber destination.

---

## Session — 2026-08-09

### A handoff described itself as an update to a program that was never built
**Issue:** The "Precision Shot Control Program — Equipment Integration v2.0" handoff opened with "This document updates the Precision Shot Control Program…". No such program existed — the registry held only `driver-program` and `break-90-program`, and a repo-wide grep for "precision"/"shot control" hit nothing but an unrelated `iron-precision` template id. Sections 2–7 were all equipment; section 4 restated modules that had no implementation to attach to.  
**Fix:** Confirmed the gap with the user before writing code, then built the program *and* the equipment layer in one pass.  
**Lesson:** When a document is versioned as an update ("v2.0", "updated structures"), verify v1.0 actually exists in the codebase before planning the diff. A confident revision doc is not evidence that its subject was ever shipped.

### iOS Safari has no Web Bluetooth — no launch monitor can be read automatically
**Issue:** The handoff's data model assumes the app captures 13 Mevo fields plus Hack Motion wrist angles "after each shot". The primary device is an iPhone, and iOS Safari implements no Web Bluetooth API at all, so a PWA cannot pair with a Mevo Gen 2 or a Hack Motion sensor under any circumstances. Every number has to be typed.  
**Fix:** Surfaced the constraint before building and let the user choose the entry granularity; landed on one summary per compile block rather than per shot.  
**Lesson:** Before designing a capture UI around external hardware, confirm the platform can actually talk to it. On iOS the answer for BLE in a browser is always no — design for manual entry and keep the tap count honest.

### `inputMode="decimal"` gives no minus key on iOS — signed metrics were unenterable
**Bug:** The first pass at the per-block metric inputs used `inputMode="decimal"`, which on iPhone shows a numeric keypad with a decimal point and no minus sign. Face-to-path, club path, attack angle and both wrist angles are all signed, and negative values carry the meaning (face left of path, bowed wrist, descending strike). Roughly half the fields could only ever have been entered as positives.  
**Fix:** `MetricField` renders an explicit `+/−` toggle beside any metric whose range crosses zero; the text input holds only the magnitude, and the toggle owns the sign. While the field is empty the toggle "arms" a sign in local state, since there is no value to carry it yet.  
**Lesson:** Any signed numeric input on mobile needs a sign control of its own. Never rely on the keypad to produce a minus — `type="number"` doesn't offer one on iOS either.

### Wrapping an existing JSX block in a conditional left the original indentation behind
**Issue:** Branching the program overview page into parallel-module vs sequential views meant wrapping ~120 existing lines in a fragment. Re-indenting them would have turned a ~30-line diff into a ~150-line one that was almost entirely whitespace.  
**Decision:** Left the wrapped block at its original indentation and marked the branch with a comment, per the surgical-changes rule.  
**Lesson:** When a conditional wrap would force a large pure-whitespace diff, keeping the original indentation is the smaller evil — but say so explicitly, or the next reader assumes it's a mistake.
