"use client";

import {
  Account,
  AvailabilityStatus,
  Campaign,
  CampaignMember,
  DEFAULT_MIN_PLAYERS,
  DEFAULT_WEIGHTS,
  SchedulingRound,
  Session,
  TIME_SLOTS,
  TimeSlot,
  AvailabilityEntry,
  slotKeyId,
} from "./core/types";
import {
  CreateCampaignInput,
  ConfirmSessionInput,
  SignUpInput,
  LogInInput,
} from "./core/schemas";
import { inviteCode, pickColor, randomId, rollingDates } from "./utils";
import {
  clearCurrentAccount,
  getCurrentAccount,
  hashPassword,
  setCurrentAccount,
} from "./auth";
import { Backend, StoreApi } from "./backends/types";
import { SupabaseBackend } from "./backends/supabase-backend";

/**
 * Data store backed by Supabase (Postgres + Realtime via the anon client).
 *
 * Selectors stay synchronous (they read an in-memory snapshot), and mutations
 * are optimistic (snapshot + emit immediately, then the backend persists).
 * Identity is derived from the logged-in account's memberships — there is no
 * device-local database or per-device identity map.
 */

export interface DB {
  accounts: Record<string, Account>;
  campaigns: Record<string, Campaign>;
  members: Record<string, CampaignMember>;
  rounds: Record<string, SchedulingRound>;
  availability: Record<string, AvailabilityEntry>; // keyed by natural key (see avKey)
  sessions: Record<string, Session>;
}

const EMPTY_DB: DB = {
  accounts: {},
  campaigns: {},
  members: {},
  rounds: {},
  availability: {},
  sessions: {},
};

let snapshot: DB = EMPTY_DB;
let hydrated = false;
const listeners = new Set<() => void>();

// Per-cell write queue. Rapid taps on one cell fire several upserts; chaining
// them guarantees they commit in tap order, so the backend lands on the value
// of the last tap rather than whichever request happens to arrive last.
const availWriteChains = new Map<string, Promise<unknown>>();

let backend: Backend = new SupabaseBackend();

function emit() {
  for (const l of listeners) l();
}

/**
 * Force a new snapshot reference + emit. Used when state that lives outside the
 * snapshot changes (e.g. the auth session in localStorage) so subscribers
 * relying on snapshot identity (useSyncExternalStore) actually re-render.
 */
function touch() {
  snapshot = { ...snapshot };
  emit();
}

export function avKey(
  roundId: string,
  memberId: string,
  date: string,
  timeSlot: string,
): string {
  return `${roundId}__${memberId}__${date}__${timeSlot}`;
}

// ---- internal API handed to backends to apply local + remote changes -------

const api: StoreApi = {
  getSnapshot: () => snapshot,
  setSnapshot: (db) => {
    snapshot = db;
    emit();
  },
  upsertAccount: (a) => {
    snapshot = { ...snapshot, accounts: { ...snapshot.accounts, [a.id]: a } };
    emit();
  },
  upsertCampaign: (c) => {
    snapshot = { ...snapshot, campaigns: { ...snapshot.campaigns, [c.id]: c } };
    emit();
  },
  upsertMember: (m) => {
    snapshot = { ...snapshot, members: { ...snapshot.members, [m.id]: m } };
    emit();
  },
  upsertRound: (r) => {
    snapshot = { ...snapshot, rounds: { ...snapshot.rounds, [r.id]: r } };
    emit();
  },
  upsertAvailability: (e) => {
    const key = avKey(e.roundId, e.memberId, e.date, e.timeSlot);
    const existing = snapshot.availability[key];
    // Last-write-wins: ignore a stale row. Rapid taps fire several optimistic
    // writes whose Realtime echoes can arrive out of order; without this guard a
    // delayed echo of an earlier tap reverts the cell, making the UI look out of
    // sync with the backend. A newer remote edit (later timestamp) still wins.
    if (existing && e.updatedAt < existing.updatedAt) return;
    snapshot = {
      ...snapshot,
      availability: { ...snapshot.availability, [key]: e },
    };
    emit();
  },
  upsertSession: (s) => {
    snapshot = { ...snapshot, sessions: { ...snapshot.sessions, [s.id]: s } };
    emit();
  },
  removeMember: (id) => {
    const members = { ...snapshot.members };
    delete members[id];
    snapshot = { ...snapshot, members };
    emit();
  },
  removeCampaign: (id) => {
    const campaigns = { ...snapshot.campaigns };
    delete campaigns[id];

    const roundIds = new Set<string>();
    const rounds = { ...snapshot.rounds };
    for (const [rid, r] of Object.entries(rounds)) {
      if (r.campaignId === id) {
        roundIds.add(rid);
        delete rounds[rid];
      }
    }
    const members = { ...snapshot.members };
    for (const [mid, m] of Object.entries(members)) {
      if (m.campaignId === id) delete members[mid];
    }
    const sessions = { ...snapshot.sessions };
    for (const [sid, s] of Object.entries(sessions)) {
      if (s.campaignId === id) delete sessions[sid];
    }
    const availability = { ...snapshot.availability };
    for (const [key, e] of Object.entries(availability)) {
      if (roundIds.has(e.roundId)) delete availability[key];
    }

    snapshot = { ...snapshot, campaigns, rounds, members, sessions, availability };
    emit();
  },
};

/**
 * Called once on the client (by the Providers) to choose, init, and start the
 * backend. Selection happens *here*, behind the `hydrated` guard, so React
 * StrictMode's double-invoked effect can't install a second, uninitialised
 * backend (which would make every write silently no-op).
 */
export function hydrate(makeBackend: () => Backend = () => new SupabaseBackend()) {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  backend = makeBackend();
  backend.init(api);
  backend.start();
}

/** Allows tests to swap in a backend before hydration. */
export function setBackend(b: Backend) {
  backend = b;
}

export function getBackend(): Backend {
  return backend;
}

// ---- useSyncExternalStore plumbing -----------------------------------------

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): DB {
  return snapshot;
}

export function getServerSnapshot(): DB {
  return EMPTY_DB;
}

// ---- identity --------------------------------------------------------------

/**
 * "Who you are" in a campaign: the member row owned by the logged-in account.
 * Identity lives in Supabase (member.accountId), not on the device, so it
 * follows you across devices and can never leak between accounts.
 */
export function getMyMemberId(campaignId: string): string | null {
  const acct = getCurrentAccount();
  if (!acct) return null;
  const member = Object.values(snapshot.members).find(
    (m) => m.campaignId === campaignId && m.accountId === acct.id,
  );
  return member?.id ?? null;
}

// ---- selectors -------------------------------------------------------------

export function getCampaignByCode(code: string): Campaign | undefined {
  return Object.values(snapshot.campaigns).find(
    (c) => c.inviteCode.toUpperCase() === code.toUpperCase(),
  );
}

export function getMembers(campaignId: string): CampaignMember[] {
  return Object.values(snapshot.members)
    .filter((m) => m.campaignId === campaignId)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));
}

export function getActiveRound(
  campaignId: string,
): SchedulingRound | undefined {
  return Object.values(snapshot.rounds).find(
    (r) => r.campaignId === campaignId && r.status === "active",
  );
}

export function getEntriesForRound(roundId: string): AvailabilityEntry[] {
  return Object.values(snapshot.availability).filter(
    (e) => e.roundId === roundId,
  );
}

export function getSessions(campaignId: string): Session[] {
  return Object.values(snapshot.sessions)
    .filter((s) => s.campaignId === campaignId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSession(id: string): Session | undefined {
  return snapshot.sessions[id];
}

export function getMyCampaigns(): Campaign[] {
  const acct = getCurrentAccount();
  if (!acct) return [];
  const ids = new Set<string>();
  for (const m of Object.values(snapshot.members)) {
    if (m.accountId === acct.id) ids.add(m.campaignId);
  }
  return Object.values(snapshot.campaigns)
    .filter((c) => ids.has(c.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---- async loaders (delegate to backend) -----------------------------------

export function ensureCampaign(code: string): Promise<void> {
  return backend.ensureCampaign(code);
}

/** Loads the logged-in account's campaigns into the snapshot. */
export async function ensureAccountCampaigns(): Promise<void> {
  const acct = getCurrentAccount();
  if (!acct) return;
  await backend.ensureAccountCampaigns(acct.id);
}

// ---- auth (lightweight email + password; see src/lib/auth.ts) --------------

export { getCurrentAccount } from "./auth";

function dbError(e: unknown): string {
  const msg =
    e && typeof e === "object" && "message" in e
      ? String((e as { message?: unknown }).message)
      : String(e);
  return `Database error: ${msg || "unknown"}. If using Supabase, check both migrations are applied and the URL/anon key are correct.`;
}

export async function signUp(
  input: SignUpInput,
  remember = true,
): Promise<{ account: Account } | { error: string }> {
  const email = input.email.trim().toLowerCase();

  let existing: Account | null;
  try {
    existing = await backend.findAccountByEmail(email);
  } catch (e) {
    return { error: dbError(e) };
  }
  if (existing) return { error: "An account with that email already exists." };

  const account: Account = {
    id: randomId(""),
    email,
    passwordHash: await hashPassword(email, input.password),
    displayName: input.displayName.trim(),
    createdAt: new Date().toISOString(),
  };
  // Optimistic: add to the snapshot, then persist to Supabase.
  api.upsertAccount(account);
  try {
    await backend.persistAccount(account);
  } catch (e) {
    return { error: dbError(e) };
  }
  setCurrentAccount(
    { id: account.id, email, displayName: account.displayName },
    remember,
  );
  touch();
  return { account };
}

export async function logIn(
  input: LogInInput,
  remember = true,
): Promise<{ account: Account } | { error: string }> {
  const email = input.email.trim().toLowerCase();

  let existing: Account | null;
  try {
    existing = await backend.findAccountByEmail(email);
  } catch (e) {
    return { error: dbError(e) };
  }
  if (!existing) return { error: "No account found for that email." };
  const hash = await hashPassword(email, input.password);
  if (hash !== existing.passwordHash) return { error: "Incorrect password." };

  api.upsertAccount(existing);
  setCurrentAccount(
    {
      id: existing.id,
      email: existing.email,
      displayName: existing.displayName,
    },
    remember,
  );
  try {
    await ensureAccountCampaigns();
  } catch {
    /* non-fatal: campaigns will load on next visit */
  }
  touch();
  return { account: existing };
}

export function logOut() {
  clearCurrentAccount();
  touch();
}

/**
 * Drop a stored session whose account doesn't exist in the active backend — e.g.
 * a session left in localStorage from local-first mode that lingers after env
 * vars switch the app to Supabase. Without this the app shows you as "logged in"
 * to a phantom account and never offers sign-up. A network error is treated as
 * "unknown" (session kept) so a transient blip never logs you out.
 */
export async function verifySession(): Promise<void> {
  const acct = getCurrentAccount();
  if (!acct) return;
  let found: Account | null;
  try {
    found = await backend.findAccountByEmail(acct.email);
  } catch {
    return;
  }
  if (!found || found.id !== acct.id) {
    clearCurrentAccount();
    touch();
  }
}

// ---- mutations (optimistic + backend persistence) --------------------------

export function createCampaign(input: CreateCampaignInput): {
  campaign: Campaign;
  host: CampaignMember;
  round: SchedulingRound;
} {
  const now = new Date().toISOString();
  const campaignId = randomId("");
  const hostId = randomId("");
  const roundId = randomId("");
  const acct = getCurrentAccount();

  const host: CampaignMember = {
    id: hostId,
    campaignId,
    guestName: acct?.displayName ?? input.hostName,
    accountId: acct?.id ?? null,
    role: "dm",
    color: pickColor(0),
    joinedAt: now,
  };

  const campaign: Campaign = {
    id: campaignId,
    name: input.name,
    description: input.description,
    hostId,
    inviteCode: inviteCode(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    settings: {
      weights: DEFAULT_WEIGHTS,
      timeSlots: [...TIME_SLOTS],
      minPlayers: input.minPlayers,
    },
    archivedAt: null,
    createdAt: now,
  };

  const round: SchedulingRound = {
    id: roundId,
    campaignId,
    title: "Availability",
    dates: rollingDates(),
    timeSlots: [...TIME_SLOTS],
    status: "active",
    createdAt: now,
  };

  api.upsertCampaign(campaign);
  api.upsertMember(host);
  api.upsertRound(round);
  void backend.persistCreateCampaign(campaign, host, round);
  return { campaign, host, round };
}

/** DM-only: change the minimum players (excluding the DM) for a viable session. */
export function updateMinPlayers(campaignId: string, minPlayers: number) {
  const campaign = snapshot.campaigns[campaignId];
  if (!campaign) return;
  const updated: Campaign = {
    ...campaign,
    settings: { ...campaign.settings, minPlayers },
  };
  api.upsertCampaign(updated);
  void backend.persistUpdateCampaign(updated);
}

/** DM-only: rename the campaign. */
export function renameCampaign(campaignId: string, name: string) {
  const campaign = snapshot.campaigns[campaignId];
  if (!campaign) return;
  const trimmed = name.trim();
  if (!trimmed || trimmed === campaign.name) return;
  const updated: Campaign = { ...campaign, name: trimmed };
  api.upsertCampaign(updated);
  void backend.persistUpdateCampaign(updated);
}

/** DM-only: delete the campaign and all of its data (members, rounds, sessions). */
export function deleteCampaign(campaignId: string) {
  if (!snapshot.campaigns[campaignId]) return;
  api.removeCampaign(campaignId);
  void backend.persistDeleteCampaign(campaignId);
}

export function joinAsGuest(
  campaignId: string,
  name: string,
): CampaignMember {
  const existingId = getMyMemberId(campaignId);
  if (existingId && snapshot.members[existingId]) {
    return snapshot.members[existingId];
  }
  const now = new Date().toISOString();
  const id = randomId("");
  const count = getMembers(campaignId).length;
  const acct = getCurrentAccount();
  const member: CampaignMember = {
    id,
    campaignId,
    guestName: name,
    accountId: acct?.id ?? null,
    role: "player",
    color: pickColor(count),
    joinedAt: now,
  };
  api.upsertMember(member);
  void backend.persistJoinMember(member);
  return member;
}

export function setAvailability(
  roundId: string,
  memberId: string,
  date: string,
  timeSlot: TimeSlot,
  status: AvailabilityStatus,
): void {
  const key = avKey(roundId, memberId, date, timeSlot);
  const existing = snapshot.availability[key];
  const entry: AvailabilityEntry = {
    id: existing?.id ?? randomId(""),
    roundId,
    memberId,
    date,
    timeSlot,
    status,
    updatedAt: new Date().toISOString(),
  };
  api.upsertAvailability(entry);
  const member = snapshot.members[memberId];
  // Serialize writes to this cell so a burst of taps commits in order.
  const prev = availWriteChains.get(key) ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => backend.persistSetAvailability(entry, member));
  availWriteChains.set(key, next);
  void next.finally(() => {
    if (availWriteChains.get(key) === next) availWriteChains.delete(key);
  });
}

/**
 * Mark many cells at once (the "Mark all" tool). Updates the snapshot a single
 * time and pushes one batched upsert, rather than firing a write per cell.
 */
export function setAvailabilityBulk(
  roundId: string,
  memberId: string,
  cells: { date: string; timeSlot: TimeSlot }[],
  status: AvailabilityStatus,
): void {
  if (cells.length === 0) return;
  const now = new Date().toISOString();
  const availability = { ...snapshot.availability };
  const entries: AvailabilityEntry[] = [];
  for (const { date, timeSlot } of cells) {
    const key = avKey(roundId, memberId, date, timeSlot);
    const entry: AvailabilityEntry = {
      id: availability[key]?.id ?? randomId(""),
      roundId,
      memberId,
      date,
      timeSlot,
      status,
      updatedAt: now,
    };
    availability[key] = entry;
    entries.push(entry);
  }
  snapshot = { ...snapshot, availability };
  emit();
  void backend.persistSetAvailabilityBulk(entries);
}

/** Cycle a cell's status: available -> maybe -> unavailable -> available. */
export function cycleStatus(
  current: AvailabilityStatus | undefined,
): AvailabilityStatus {
  switch (current) {
    case "available":
      return "maybe";
    case "maybe":
      return "unavailable";
    case "unavailable":
      return "available";
    default:
      return "available";
  }
}

export function confirmSession(
  input: ConfirmSessionInput,
  confirmedBy: string,
): Session {
  const now = new Date().toISOString();
  const session: Session = {
    id: randomId(""),
    campaignId: input.campaignId,
    roundId: input.roundId ?? null,
    date: input.date,
    timeSlot: input.timeSlot,
    status: "confirmed",
    notes: input.notes,
    locked: true,
    confirmedBy,
    confirmedAt: now,
    createdAt: now,
  };
  api.upsertSession(session);
  const dm = snapshot.members[confirmedBy];
  void backend.persistConfirmSession(session, dm);
  return session;
}

export function cancelSession(id: string): void {
  const session = snapshot.sessions[id];
  if (!session) return;
  const updated: Session = { ...session, status: "canceled", locked: false };
  api.upsertSession(updated);
  void backend.persistCancelSession(id);
}

/** Test/demo helper: wipe everything. */
export function resetStore() {
  snapshot = EMPTY_DB;
  clearCurrentAccount();
  backend.reset();
  emit();
}

export { TIME_SLOTS, slotKeyId };
