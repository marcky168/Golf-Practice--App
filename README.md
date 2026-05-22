# Golf Practice OS

**Deliberate, focused golf practice for the range.**  
Block • Random • Games • Reflection • Calendar

A clean, mobile-first Progressive Web App built to help you get dramatically better at golf through structured, science-backed practice sessions — without any round or shot tracking (use Arccos for that).

## Why This Exists

Most golfers waste range time on mindless block repetition. Research (and coaches like Greg Rose / TPI) shows **random/interleaved practice** transfers far better to the course. This app makes doing the right thing effortless.

It also bakes in principles from Andrew Huberman’s work on skill acquisition:
- Focused attention + single cues
- High-quality repetition density
- Post-practice neural replay window
- Structured reflection

## Current Status

This is an early, beautiful, fully-navigable foundation. The core experience (real interactive Block / Random / Games sessions + Supabase persistence) is being built in clear vertical slices right now.

See the detailed implementation plan in the `.grok` session folder if you have access, or the `SETUP.md` (coming) for deployment.

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind v4 + shadcn/ui (New York) — golf-themed forest green + gold
- Supabase (auth + history persistence)
- Official PWA (installable on Android / Chrome / Edge)
- Zero heavy dependencies — stays fast and maintainable

## Getting Started (Local Development)

1. Clone the repo
2. `npm install`
3. Copy `.env.example` → `.env.local` and add your Supabase keys (see SETUP.md)
4. `npm run dev`

The app is designed to work beautifully even before the full backend is wired (many flows have lovely placeholders).

## Key Principles (for contributors / future you)

- All practice content lives in `lib/practice/` — pure data + functions. Extremely easy to extend.
- Server Components + Server Actions by default.
- Mobile-first, sunlight-readable, large touch targets.
- Every session ends with reflection prompts (this is gold for long-term improvement).

## Roadmap (High Level)

- [x] Beautiful foundation + PWA + navigation
- [ ] Full Block Practice runner + reflection + save
- [ ] Random generator + runner
- [ ] 6 Games with real scoring
- [ ] History + Calendar + Google Calendar one-click
- [ ] Polish, stats, onboarding

## License & Usage

Personal use. Feel free to fork and adapt for your own game.

---

Built with care for people who actually want to get better at golf.
