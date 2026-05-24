# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes.  
Merge with any project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First
**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently.

---

## MEMORY + STACK (Persistent Memory Across Sessions)

Claude MUST read these files at the start of every single session:
- MEMORY.md (decision log)
- ERRORS.md (failure log)

### Tech stack (locked)
- **Framework:** Next.js 15 App Router, TypeScript — all pages use the App Router convention (`app/` directory, server components by default, `"use client"` only when needed)
- **Styling:** Tailwind CSS + shadcn/ui component library
- **Backend / DB:** Supabase (PostgreSQL + Row Level Security + Auth) — `createClient()` from `@/lib/supabase/server` for server components, `@/lib/supabase/client` for client components
- **Audio:** Web Audio API + HTMLAudioElement fallback (see `lib/practice/feedback.ts`) — all audio must be unlocked via a user gesture first
- **Toasts:** Sonner (`toast.success`, `toast.error`, etc.)
- **Icons:** Lucide React only
- **Dates:** date-fns
- **PWA:** Service worker registered via `PwaRegister` in root layout

**Forbidden — do not suggest or switch to:**
- React Pages Router (`pages/` directory)
- Prisma, Drizzle, or any ORM other than direct Supabase queries
- Firebase, PlanetScale, or any non-Supabase backend
- Any CSS framework other than Tailwind
- Python or non-JS/TS runtimes

### Permanent facts
- This is a solo-developer mobile-first PWA for deliberate golf range practice.
- All session data is stored in Supabase `practice_sessions` table with a `config` JSONB column — keep this single-table design; do not add new tables without explicit discussion.
- Audio must degrade gracefully — never throw on audio failure, always wrap in try/catch.
- The primary user is on iPhone; test all interactions for iOS Safari compatibility.
- Session types: `"block" | "random" | "mixed" | "game" | "planned"` — do not add new types without discussion.
- Rep error corrections (`RepErrorCorrection` in `lib/practice/types.ts`) are the core learning-signal data model — treat changes carefully.
- The neuro-science framing (Huberman protocols, dopamine gating, ultradian rhythm) is intentional and should be preserved in copy/UX.

### MEMORY.md — Decision Log
- Log every major decision, the reasoning behind it, and any alternatives we explicitly rejected (and why).
- Update MEMORY.md at the end of every session with new decisions.

### ERRORS.md — Failure Log
- Record every error, bug, failed approach, and the exact lesson learned.
- Update ERRORS.md at the end of every session.

### Session End Summary (always do this)
At the very end of every session, output a clear summary in this exact format, then update MEMORY.md and ERRORS.md:

**Session Summary:**
- Key decisions made:
- Changes implemented:
- Things ruled out and why:
- Open questions / next steps:

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, clarifying questions come before implementation, and Claude remembers previous decisions across sessions.
