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

---

## Standing rules derived from errors above

1. **Always check for double-firing on `useEffect` with `[dep]` arrays** — mount and dep-change both fire on first render with the same values.
2. **Random events with UX consequences need minimum gaps** — not just probability caps.
3. **Navigation consistency check before shipping any new feature** — if it appears in one nav entry point, it must appear in all relevant ones.
4. **Use session title (not type) for human-readable "most used" displays.**
5. **When a UI gains phase awareness, audit any data fields that were compensating for the lack of it.**
