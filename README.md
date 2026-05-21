# Council — D&D Session Planner

Find the night your whole party can actually play. Everyone taps their
availability across the next few weeks and Council instantly surfaces the
**best session time**. A mobile-first mix of When2Meet + Doodle, with a subtle
dark-fantasy look.

> A small, free app for you and your friends. A lightweight email/password
> login (no paywall, no OAuth) so your campaigns follow you.
> One codebase → web (and iOS/Android later via Capacitor).

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # scoring unit tests
npm run build    # static export to ./out
```

Council stores everything in a free Supabase project so your party can join from
**their own phones**, with availability syncing in realtime. Setup takes a couple
of minutes (below) — without Supabase env vars the app shows a setup notice
instead of running.

---

## How people use it

1. Sign in with an **email + password**, then **Create a campaign** (name it,
   set the minimum players for a session). Dates fill in automatically — the
   next ~5 weeks × morning/afternoon/evening.
2. Hit the **share** icon → send the invite link to your party.
3. Everyone opens the link, signs in, **joins**, and marks their availability
   (tap to cycle, or **hold & drag** to paint). The grid and the Best/Backup
   recommendation update **live**. A ✓ marks days with enough players free.
4. As the DM, press **Confirm** on a recommendation to book the session.

Login is intentionally lightweight — it just ties a person to their campaigns
(passwords are hashed, but there's no email verification or OAuth). The invite
code still gates access to a campaign, like When2Meet or Doodle; don't store
sensitive data here.

---

## Set up Supabase (required)

The free tier is plenty for a gaming group. No credit card, no Edge Functions,
no OAuth.

1. Create a project at [supabase.com](https://supabase.com). In
   **Settings → API**, copy the **Project URL** and the **anon/public key** into
   `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
2. Open the Supabase **SQL editor** and run the migrations in order:
   `supabase/migrations/0001_init.sql`, then `supabase/migrations/0002_accounts.sql`
   (the latter adds the login `accounts` table). (Or `supabase db push`.)
3. Restart `npm run dev`. The app auto-detects the env vars and stores everything
   in Supabase, with second devices updating in realtime.

**How access works:** the app uses the public anon key for everyone, and RLS is
left permissive — the unguessable invite code is the gate. That's the right
trade-off for a private friends app; don't use it for sensitive data.

## Deploy a shareable link (Vercel, free)

1. Push this folder to a GitHub repo and import it at
   [vercel.com](https://vercel.com) (free Hobby plan).
2. Add the same two `NEXT_PUBLIC_SUPABASE_*` env vars in the Vercel project
   settings.
3. Deploy → you get a URL like `https://your-app.vercel.app` to send your party.

(Any static host works too — `npm run build` outputs a plain static site to
`./out`.)

---

## How it works

```
src/
  app/                     # pages (static export, App Router)
    page.tsx               #   landing / join
    create/                #   create a campaign
    dashboard/             #   campaigns this device knows
    campaign/?code=        #   overview + join-as-guest
    plan/?code=            #   ★ availability planner (the core loop)
    session/?code=&id=     #   confirmed session details
    settings/
  components/
    ui/                    # button, card, badge, input, modal
    availability/          # AvailabilityGrid (tap-cycle + drag-paint), status
    scoring/               # RecommendationCard
    campaign/              # MemberList, InviteSheet (link + QR)
    layout/                # AppShell (header + theme toggle)
  lib/
    core/                  # framework-agnostic: types, zod schemas, scoring ★
    store.ts               # in-memory store + optimistic mutations
    backends/              # SupabaseBackend (Postgres + Realtime)
    supabase/              # anon client + row<->domain mappers
    hooks.ts               # React bindings (useCampaign, useScores, …)
supabase/
  migrations/0001_init.sql # schema + permissive RLS + realtime
capacitor.config.ts        # native shell config (webDir: out)
```

**Scoring** (`src/lib/core/scoring.ts`) is a pure, unit-tested function. For each
`date × slot`:

```
potential = available + maybe
score     = available*2 + maybe*1 - unavailable*2 + (DM available ? +1 : 0)
heat      = available / members        → heatmap intensity
```

`recommend()` returns **Best**, **Good backup** (different date), and **Avoid**.

**Storage** lives behind one interface (`src/lib/backends/`): the
`SupabaseBackend` (Postgres + Realtime via the anon client) is the single source
of truth. Supabase env vars are required — without them the app shows a setup
notice instead of running. The only data kept on the device is the login session
and theme preference (localStorage).

**Routing note:** runtime IDs use query params (`/plan/?code=ABC123`) so the app
is a clean static export that runs the same on the web and inside Capacitor.

---

## Mobile (Capacitor) — optional, later

```bash
npm i -D @capacitor/cli && npm i @capacitor/core
npm run build            # produces ./out
npx cap add ios          # / android
npx cap sync
npx cap open ios         # / android
```

`capacitor.config.ts` already points `webDir` at `out`.

---

## Roadmap

- **Now:** create → invite (link/QR) → join with a name → availability grid
  (tap + drag) → live scoring + recommendations → confirm session. Dark,
  responsive, accessible (status = icon + label, not color alone). Free Supabase
  sync across devices.
- **Maybe later:** Discord webhook reminder when a session is confirmed,
  timezone display, Google Calendar export, "same as last week", archive/
  duplicate a week, native store builds.
