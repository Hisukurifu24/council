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
(FNV-1a hashed, stored via the anon key in `accounts`, no email verification);
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
npm test         # vitest — scoring + voice-parse unit tests
npm test src/lib/core/scoring.test.ts   # run a single test file
npm run build    # static export to ./out
```

Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) go
in `.env.local`. Apply both migrations in `supabase/migrations/` before first run.

## Pages and routing

All runtime IDs travel as **query params** (`?code=ABC`), never as dynamic route
segments, to stay static-export compatible with Capacitor.

| Route | Purpose |
|---|---|
| `/` | Join / enter invite code |
| `/dashboard/` | Logged-in user's campaign list |
| `/create/` | Create a new campaign |
| `/campaign/?code=` | Campaign detail (DM settings, member list, session history) |
| `/plan/?code=` | Availability grid + recommendations |
| `/session/?code=&id=` | Confirmed session detail |
| `/settings/` | Account settings + theme toggle |

Pages that call `useSearchParams()` are wrapped in `<Suspense>` — required by the
static export. Pages behind login are wrapped in `<AuthGate>` from
`src/components/auth/auth-gate.tsx`.

## Architecture notes

### Store (`src/lib/store.ts`)

A module-level in-memory `snapshot: DB` is the single source of truth on the
client. Mutations are **optimistic**: they update the snapshot immediately and
fire-and-forget backend writes (`void backend.persist*(…)`). Supabase Realtime
reconciles other clients. The store exposes `subscribe`/`getSnapshot`/
`getServerSnapshot` for `useSyncExternalStore`; `useDb()` in `hooks.ts` subscribes
the whole store and re-renders on any change.

`hydrate()` in the store is guarded by a `hydrated` boolean so React StrictMode's
double-invoked effects can't install a second, un-initialised backend. It is called
once from `<Providers>` (`src/components/providers.tsx`).

### Keys

- Availability cells: `avKey(roundId, memberId, date, timeSlot)` →
  `"roundId__memberId__date__timeSlot"` (store) and
  `unique (round_id, member_id, date, time_slot)` in Postgres (conflict target for
  upserts).
- Slot display: `slotKeyId(date, timeSlot)` → `"date__timeSlot"` (used to index
  `ScoreModel.byCell`).

### Identity

`getCurrentAccount()` reads `localStorage["dndtime:auth"]`. "Who you are" in a
campaign is the `CampaignMember` row whose `accountId` matches the logged-in
account — resolved synchronously from the snapshot by `getMyMemberId(campaignId)`.
There is no per-device identity map; identity follows the account across devices.

### Core (framework-agnostic, `src/lib/core/`)

- **`types.ts`** — domain types + constants. Keep dependency-free.
- **`scoring.ts`** — `scoreRound()` scores every date×slot cell; `recommend()`
  produces Best/Backup/Avoid recommendations. Pure functions; fully unit-tested.
- **`voice-parse.ts`** — `parseAvailabilitySpeech()` turns a typed or spoken
  sentence (EN + IT) into availability cells. Uses FNV word matching with
  clause splitting on conjunctions. Pure function; fully unit-tested.
- **`schemas.ts`** — Zod validation schemas for form inputs.

### Availability grid (`src/components/availability/availability-grid.tsx`)

Supports tap-to-cycle and drag-to-paint across cells. On **mouse**: `pointerdown`
starts a paint, `pointerenter` continues it. On **touch/pen**: a 280 ms long-press
arms painting; a short release before that threshold is treated as a tap. Finger
movement > 10 px before the long-press fires cancels it so the page can scroll
normally.

### Voice / typed marking (`src/components/availability/voice-mark.tsx`)

Uses the Web Speech API (`useSpeechRecognition` in `src/lib/use-speech.ts`).
Mirrors the live transcript into the text field while listening; auto-parses on
stop. Falls back to typed input when the API is unavailable. Supports EN and IT.

### Database schema

Six tables: `campaigns`, `campaign_members`, `scheduling_rounds`,
`availability_entries`, `sessions`, `accounts`. Child rows cascade-delete when a
campaign is deleted. `availability_entries`, `campaign_members`, and `sessions` are
in the `supabase_realtime` publication; per-campaign channels are opened lazily in
`SupabaseBackend.ensureCampaign()` / `persistCreateCampaign()`.

### Rolling dates

Campaigns no longer store candidate dates. `rollingDates()` in `src/lib/utils.ts`
generates today → today+34 (35 days) on every render. `useCampaign()` patches the
real `SchedulingRound.dates` with the fresh window so the planner never expires;
availability entries keep their real `roundId`.

### Accessibility

Availability status is conveyed by **icon + label**, never color alone (see
`StatusChip`/`StatusGlyph` in `src/components/availability/status.tsx`).
Grid cells have full `aria-label` text including counts and the user's own status.
