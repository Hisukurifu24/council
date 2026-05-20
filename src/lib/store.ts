"use client";

import {
  AvailabilityStatus,
  Campaign,
  CampaignMember,
  DEFAULT_WEIGHTS,
  SchedulingRound,
  Session,
  TIME_SLOTS,
  TimeSlot,
  AvailabilityEntry,
  slotKeyId,
} from "./core/types";
import { CreateCampaignInput, ConfirmSessionInput } from "./core/schemas";
import { inviteCode, pickColor, randomId } from "./utils";
import { Backend, StoreApi } from "./backends/types";
import { LocalBackend } from "./backends/local-backend";

/**
 * Data store with a swappable backend.
 *
 * Selectors stay synchronous (they read an in-memory snapshot), and mutations
 * are optimistic (snapshot + emit immediately, then the backend persists).
 * - LocalBackend: localStorage + BroadcastChannel (default, zero setup).
 * - SupabaseBackend: Postgres + Realtime via the anon client (when env set).
 * The UI never knows which backend is active.
 */

export interface DB {
  campaigns: Record<string, Campaign>;
  members: Record<string, CampaignMember>;
  rounds: Record<string, SchedulingRound>;
  availability: Record<string, AvailabilityEntry>; // keyed by natural key (see avKey)
  sessions: Record<string, Session>;
}

const EMPTY_DB: DB = {
  campaigns: {},
  members: {},
  rounds: {},
  availability: {},
  sessions: {},
};

const ME_KEY = "dndtime:me"; // campaignId -> memberId (who "you" are on this device)

let snapshot: DB = EMPTY_DB;
let hydrated = false;
const listeners = new Set<() => void>();

let backend: Backend = new LocalBackend();

function emit() {
  for (const l of listeners) l();
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
  getKnownCampaignIds: () => getKnownCampaignIds(),
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
    snapshot = {
      ...snapshot,
      availability: {
        ...snapshot.availability,
        [avKey(e.roundId, e.memberId, e.date, e.timeSlot)]: e,
      },
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
};

/** Called once on the client (by the Providers) to load + start syncing. */
export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  // Backend is chosen lazily here so env is available.
  // (LocalBackend is the default already set above.)
  backend.init(api);
  backend.start();
}

/** Allows the auth layer to swap in the Supabase backend before hydration. */
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

function readMe(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ME_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function getMyMemberId(campaignId: string): string | null {
  if (typeof window === "undefined") return null;
  return readMe()[campaignId] ?? null;
}

export function setMyMemberId(campaignId: string, memberId: string) {
  const me = readMe();
  me[campaignId] = memberId;
  localStorage.setItem(ME_KEY, JSON.stringify(me));
}

/** Campaign ids this device has created or joined (drives the dashboard list). */
export function getKnownCampaignIds(): string[] {
  if (typeof window === "undefined") return [];
  return Object.keys(readMe());
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
  if (typeof window === "undefined") return [];
  const ids = new Set(getKnownCampaignIds());
  return Object.values(snapshot.campaigns)
    .filter((c) => ids.has(c.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ---- async loaders (delegate to backend) -----------------------------------

export function ensureCampaign(code: string): Promise<void> {
  return backend.ensureCampaign(code);
}

export function ensureMyCampaigns(): Promise<void> {
  return backend.ensureMyCampaigns();
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

  const host: CampaignMember = {
    id: hostId,
    campaignId,
    guestName: input.hostName,
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
    settings: { weights: DEFAULT_WEIGHTS, timeSlots: input.timeSlots },
    archivedAt: null,
    createdAt: now,
  };

  const round: SchedulingRound = {
    id: roundId,
    campaignId,
    title: "This week",
    dates: input.dates,
    timeSlots: input.timeSlots,
    status: "active",
    createdAt: now,
  };

  api.upsertCampaign(campaign);
  api.upsertMember(host);
  api.upsertRound(round);
  setMyMemberId(campaignId, hostId);
  void backend.persistCreateCampaign(campaign, host, round);
  return { campaign, host, round };
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
  const member: CampaignMember = {
    id,
    campaignId,
    guestName: name,
    role: "player",
    color: pickColor(count),
    joinedAt: now,
  };
  api.upsertMember(member);
  setMyMemberId(campaignId, id);
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
  void backend.persistSetAvailability(entry, member);
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

/** Test/demo helper: wipe everything. */
export function resetStore() {
  snapshot = EMPTY_DB;
  try {
    localStorage.removeItem(ME_KEY);
  } catch {
    /* ignore */
  }
  backend.reset();
  emit();
}

export { TIME_SLOTS, slotKeyId };
