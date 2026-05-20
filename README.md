# Council — D&D Session Planner

Find the night your whole party can actually play. Drop in candidate dates, let
everyone tap their availability, and Council instantly surfaces the **best
session time**. A mobile-first mix of When2Meet + Doodle, with a subtle
dark-fantasy look.

> A small, free app for you and your friends. No accounts, no paywall.
> One codebase → web (and iOS/Android later via Capacitor).

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # scoring unit tests
npm run build    # static export to ./out
```

With no setup the app runs **local-first** (campaigns live in your browser and
sync across tabs) — great for trying it out on one device. To let friends join
from **their own phones**, point it at a free Supabase project (below).

---

## How people use it

1. Open `/`, **Create a campaign**, pick a few dates, create it.
2. Hit the **share** icon → send the invite link to your party.
3. Everyone opens the link, joins with a **name** (no login), and taps their
   availability. The grid and the Best/Backup recommendation update **live**.
4. As the DM, press **Confirm** on a recommendation to book the session.

There are no accounts. The invite link is the key — anyone with it can view and
edit that campaign, like When2Meet or Doodle.

---

## Make it shared & free (Supabase)

The free tier is plenty for a gaming group. No credit card, no Edge Functions,
no OAuth.

1. Create a project at [supabase.com](https://supabase.com). In
   **Settings → API**, copy the **Project URL** and the **anon/public key** into
   `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
2. Open the Supabase **SQL editor**, paste the contents of
   `supabase/migrations/0001_init.sql`, and run it. (Or `supabase db push`.)
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
    backends/              # LocalBackend (localStorage) / SupabaseBackend
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

**Backends are swappable** behind one interface (`src/lib/backends/`): with no
env vars the `LocalBackend` (localStorage + BroadcastChannel) runs; with Supabase
env vars the `SupabaseBackend` (Postgres + Realtime) takes over. The UI never
changes.

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
