"use client";

/**
 * Lightweight, backend-agnostic auth helpers.
 *
 * This is intentionally NOT real security — it's a "who are you" gate for a
 * private friends app with no sensitive data. Passwords are run through a small
 * salted hash so they aren't stored in plaintext, but the accounts table is
 * readable via the Supabase anon key like everything else. No OAuth, no email
 * verification, no Edge Functions.
 *
 * The hash is a pure-JS FNV-1a (not Web Crypto) on purpose: `crypto.subtle` is
 * only available on secure origins, so it would silently fail when the dev app
 * is opened over a LAN IP (e.g. testing on a phone). This works everywhere and
 * is deterministic across devices.
 */

const AUTH_KEY = "dndtime:auth"; // current session: { id, email, displayName }
const SALT = "council:v1"; // static salt — deters casual plaintext, nothing more

export interface AuthSession {
  id: string;
  email: string;
  displayName: string;
}

export async function hashPassword(
  email: string,
  password: string,
): Promise<string> {
  const input = `${SALT}:${email.toLowerCase()}:${password}`;
  let out = "";
  // 8 FNV-1a passes (round mixed in) → a stable 64-char hex digest.
  for (let round = 0; round < 8; round++) {
    let h = (0x811c9dc5 ^ round) >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    out += (h >>> 0).toString(16).padStart(8, "0");
  }
  return out;
}

export function getCurrentAccount(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    // "Remember me" → localStorage (survives browser restart); otherwise
    // sessionStorage (cleared when the tab/browser closes).
    const raw =
      localStorage.getItem(AUTH_KEY) ?? sessionStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function setCurrentAccount(session: AuthSession, remember = true) {
  try {
    const value = JSON.stringify(session);
    if (remember) {
      localStorage.setItem(AUTH_KEY, value);
      sessionStorage.removeItem(AUTH_KEY);
    } else {
      sessionStorage.setItem(AUTH_KEY, value);
      localStorage.removeItem(AUTH_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function clearCurrentAccount() {
  try {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}
