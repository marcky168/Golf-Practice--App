# AGENTS.md — Golf Practice OS

This document exists so that any AI coding agent (including future versions of Grok, Cursor, Claude, etc.) can work effectively and safely in this codebase without breaking its core values.

## Project Philosophy

- **Deliberate practice first.** Every feature must help the user do high-quality, focused work on the range.
- **Random > Block for transfer.** We heavily emphasize good random/interleaved generators.
- **Huberman-aligned.** Focus cues, reflection, neural replay reminders are sacred.
- **Mobile at the range.** Large targets, high contrast, fast, calm.
- **Extremely maintainable.** The user (or their future self) must be able to add drills/games in < 20 minutes without reading 10 files.
- **No scope creep.** We do NOT build round tracking, launch monitor sync, or social features unless explicitly requested.

## Where to Make Changes

### Adding New Drills or Random Content
→ Only edit `lib/practice/drills.ts` and `lib/practice/generators.ts`

### Adding a New Game or Challenge
→ Primarily `lib/practice/games.ts` + one small scoring component in `components/practice/`

### Adding a Pre-built Template
→ `lib/practice/templates.ts`

### Styling or Component Polish
→ `app/globals.css` for tokens. Individual shadcn components live in `components/ui/` (you own them completely).

### New Routes / Major UX Flows
→ Follow existing patterns: `app/practice/*`, `app/history/*`, `app/calendar/*`

### Supabase / Data Layer
→ Use the existing `lib/supabase/{client,server,proxy}.ts` pattern.
→ All tables must have strict RLS tied to `auth.uid()`.
→ Prefer `config jsonb` + top-level queryable fields for sessions.

### PWA / Install Experience
→ `app/manifest.ts` + `public/sw.js` + `components/PwaRegister.tsx`

## Never Do These Things

- Do not add heavy global state libraries unless the session runner genuinely requires it.
- Do not create new practice logic scattered across components — keep it in `lib/practice/`.
- Do not reduce touch target sizes below 44–48px.
- Do not remove the reflection step at the end of sessions.
- Do not make the Google Calendar integration require OAuth in the MVP (URL scheme is intentional and perfect).

## Coding Style

- Prefer Server Components. Only use `"use client"` for timers, interactive scoring, and local UI state.
- Use Server Actions for all writes.
- Keep components small and focused.
- Comments are welcome when they explain *why* (especially around motor learning or Huberman rationale).
- All new practice content must include a short "Why this helps" line.

## Testing a Change

After any meaningful edit, the agent or developer should:
1. `npm run typecheck`
2. `npm run lint`
3. Manually test the affected flow on a real phone (or responsive dev tools at 375px).

## Future Enhancement Ideas (only implement when asked)

- Voice notes for reflections (Web Speech API)
- Export sessions to CSV / PDF
- Full Google Calendar two-way sync via Supabase + Edge Functions
- Coach sharing / template library
- Optional launch monitor CSV import for stats nerds

## Contact / Ownership

This is a personal tool for the owner. Treat it with the same respect you would treat someone’s private journal.

---

When in doubt, ask: "Does this help a golfer do better deliberate practice on the range with their phone in one hand?"

If the answer is clearly yes, proceed.
