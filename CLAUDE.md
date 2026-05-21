# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Council** is a small, free D&D session planner for a group of friends: a group
marks availability across dates × time-slots (morning/afternoon/evening) and the
app computes the best meeting time. Mobile-first, dark-fantasy theme. Web now,
iOS/Android later via Capacitor. A **lightweight email/password login** ties each
person to their campaigns; the invite code still gates each campaign.
See `README.md` for the full overview.

## Scope

This is intentionally a private, friends-only app — not a commercial product.
Keep it simple and free: no OAuth/SSO, no Edge Functions, no paid services, no
monetization. The login is deliberately minimal — a custom email/password layer
(SHA-256 hashed, stored via the anon key in `accounts`, no email verification);
it is NOT real security, just identity. Don't reintroduce heavier auth.

## Tech stack

- **Next.js 14 (App Router) + TypeScript + TailwindCSS** — static export (`output: 'export'`).
- **Capacitor** wraps the `out/` build for iOS/Android (config only, not added yet).
- **Supabase free tier** for shared storage (Postgres + Realtime), accessed with
  the **public anon key only**. Schema in `supabase/migrations`. RLS is permissive
  — the unguessable invite code is the access control. No Edge Functions.
  Supabase is **required**: with no env vars the app shows a setup notice instead
  of running (there is no local-only fallback). The only device-local state is the
  login session and theme preference (localStorage).

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest — scoring unit tests
npm run build    # static export to ./out
```

## Architecture notes

- **`src/lib/core/`** is framework-agnostic (types, zod schemas, scoring). The
  scoring algorithm (`scoring.ts`) is a pure, unit-tested function. Keep it
  dependency-free.
- **`src/lib/store.ts`** holds an in-memory snapshot with synchronous selectors
  and optimistic mutations; persistence is delegated to a **backend**
  (`src/lib/backends/`). `SupabaseBackend` (anon Postgres + Realtime) is the only
  backend and the single source of truth.
- **Identity**: a lightweight account (`src/lib/auth.ts`, `dndtime:auth`) logs a
  person in by email/password; campaign memberships carry an `accountId`. "Who you
  are" in a campaign is derived from the logged-in account's membership in the
  snapshot (`getMyMemberId`/`getMyCampaigns`), so it follows the user across
  devices and can't leak between accounts — there is no per-device identity map.
  All Supabase reads/writes go through the anon client directly.
- **Dates are auto-generated**: campaigns no longer pick candidate dates/slots.
  The grid shows a **rolling window** (today → ~5 weeks, `rollingDates()` in
  `utils.ts`) × all 3 time slots; availability entries are keyed by absolute date.
- **Min players**: `campaign.settings.minPlayers` (excluding the DM) gates which
  slots count as viable sessions — see `scoreRound`/`recommend` in `scoring.ts`.
- Runtime IDs use **query params** (`/plan/?code=ABC`) not dynamic route
  segments, to stay static-export friendly for Capacitor.
- Pages that read `useSearchParams` must be wrapped in `<Suspense>` (required by
  static export).
- Accessibility: availability status is conveyed by **icon + label**, never color
  alone.
