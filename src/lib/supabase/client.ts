"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a configured Supabase client, or null when env vars are not set
 * (in which case the app runs in local-first mode — see src/lib/store.ts).
 *
 * Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local)
 * and apply supabase/migrations to switch the app to shared Supabase storage.
 * There are no accounts — the anon client is used for all reads/writes.
 */
let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached =
    url && anon
      ? createClient(url, anon, { auth: { persistSession: false } })
      : null;
  return cached;
}

export const isSupabaseEnabled = () =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
