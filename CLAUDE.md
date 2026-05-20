# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Council** is a small, free D&D session planner for a group of friends: a group
marks availability across dates × time-slots (morning/afternoon/evening) and the
app computes the best meeting time. Mobile-first, dark-fantasy theme. Web now,
iOS/Android later via Capacitor. **No accounts** — the invite link is the key.
See `README.md` for the full overview.

## Scope

This is intentionally a private, friends-only app — not a commercial product.
Keep it simple and free: no auth/OAuth, no Edge Functions, no paid services, no
monetization. Don't reintroduce that complexity.

## Tech stack

- **Next.js 14 (App Router) + TypeScript + TailwindCSS** — static export (`output: 'export'`).
- **Capacitor** wraps the `out/` build for iOS/Android (config only, not added yet).
- **Supabase free tier** for shared storage (Postgres + Realtime), accessed with
  the **public anon key only**. Schema in `supabase/migrations`. RLS is permissive
  — the unguessable invite code is the access control. No Edge Functions.
- With no env vars the app runs **local-first** (browser `localStorage` +
  `BroadcastChannel`), so it's runnable with zero backend setup (single device).

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
  and optimistic mutations; persistence is delegated to a swappable **backend**
  (`src/lib/backends/`). `LocalBackend` = localStorage; `SupabaseBackend` = anon
  Postgres + Realtime. The UI never knows which is active.
- **Identity is device-local**: no accounts. `dndtime:me` (localStorage) maps
  `campaignId → memberId` for "who you are" and drives the dashboard list. All
  Supabase reads/writes go through the anon client directly.
- Runtime IDs use **query params** (`/plan/?code=ABC`) not dynamic route
  segments, to stay static-export friendly for Capacitor.
- Pages that read `useSearchParams` must be wrapped in `<Suspense>` (required by
  static export).
- Accessibility: availability status is conveyed by **icon + label**, never color
  alone.
