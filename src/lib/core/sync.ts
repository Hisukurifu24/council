// Cross-campaign availability: one account, one calendar.
//
// A person's availability is stored per campaign (one row per member × cell),
// but it is really a property of the *account*. These pure helpers keep the
// per-campaign copies in step and derive "busy" slots from sessions booked in
// other campaigns. No IO — the store feeds them snapshot data.

import {
  AvailabilityEntry,
  AvailabilityStatus,
  CampaignMember,
  Session,
  TimeSlot,
  slotKeyId,
} from "./types";

/** One of the account's memberships and the active round it writes into. */
export interface SyncTarget {
  roundId: string;
  memberId: string;
}

function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Entries to write so every target round holds the account's latest status for
 * each cell (from `fromDate` on). For each cell the most recently updated entry
 * across all targets wins; a target is written when it has no entry for the
 * cell or a different status. The winner's `updatedAt` is kept, so a second
 * pass over the result is a no-op (no ping-pong between campaigns).
 */
export function planAvailabilitySync(
  targets: SyncTarget[],
  entries: AvailabilityEntry[],
  fromDate: string,
): AvailabilityEntry[] {
  if (targets.length < 2) return [];
  const targetKey = (roundId: string, memberId: string) => `${roundId}__${memberId}`;
  const isTarget = new Set(targets.map((t) => targetKey(t.roundId, t.memberId)));

  // cell -> latest entry, and cell -> (target -> its entry)
  const latest = new Map<string, AvailabilityEntry>();
  const have = new Map<string, Map<string, AvailabilityEntry>>();
  for (const e of entries) {
    if (e.date < fromDate) continue;
    const tk = targetKey(e.roundId, e.memberId);
    if (!isTarget.has(tk)) continue;
    const cell = slotKeyId(e.date, e.timeSlot);
    const cur = latest.get(cell);
    if (!cur || timeOf(e.updatedAt) > timeOf(cur.updatedAt)) latest.set(cell, e);
    let m = have.get(cell);
    if (!m) have.set(cell, (m = new Map()));
    m.set(tk, e);
  }

  const out: AvailabilityEntry[] = [];
  for (const [cell, win] of latest) {
    const existing = have.get(cell)!;
    for (const t of targets) {
      const cur = existing.get(targetKey(t.roundId, t.memberId));
      if (cur && cur.status === win.status) continue;
      out.push({
        id: cur?.id ?? "",
        roundId: t.roundId,
        memberId: t.memberId,
        date: win.date,
        timeSlot: win.timeSlot,
        status: win.status,
        updatedAt: win.updatedAt,
      });
    }
  }
  return out;
}

/** Why a member is busy in a cell: a session booked in another campaign. */
export interface BusyInfo {
  campaignId: string;
  sessionId: string;
}

/** memberId -> slotKeyId -> BusyInfo */
export type BusyMap = Map<string, Map<string, BusyInfo>>;

/**
 * Members of `campaignId` who already have a session at a given cell in another
 * campaign. Matching is by account: `allMembers` must include the memberships
 * those accounts hold elsewhere, and `sessions` those campaigns' sessions.
 * Canceled sessions and sessions of `campaignId` itself are ignored.
 */
export function busyCells(
  campaignId: string,
  allMembers: CampaignMember[],
  sessions: Session[],
): BusyMap {
  const busy: BusyMap = new Map();
  // accountId -> member id in this campaign
  const here = new Map<string, string>();
  for (const m of allMembers) {
    if (m.campaignId === campaignId && m.accountId) here.set(m.accountId, m.id);
  }
  if (here.size === 0) return busy;

  // other campaign -> accounts of ours that belong to it
  const accountsIn = new Map<string, string[]>();
  for (const m of allMembers) {
    if (m.campaignId === campaignId || !m.accountId || !here.has(m.accountId)) continue;
    const list = accountsIn.get(m.campaignId) ?? [];
    list.push(m.accountId);
    accountsIn.set(m.campaignId, list);
  }

  for (const s of sessions) {
    if (s.status === "canceled" || s.campaignId === campaignId) continue;
    const accounts = accountsIn.get(s.campaignId);
    if (!accounts) continue;
    const cell = slotKeyId(s.date, s.timeSlot);
    for (const acct of accounts) {
      const memberId = here.get(acct)!;
      let m = busy.get(memberId);
      if (!m) busy.set(memberId, (m = new Map()));
      if (!m.has(cell)) m.set(cell, { campaignId: s.campaignId, sessionId: s.id });
    }
  }
  return busy;
}

/**
 * Overlay busy cells on a round's entries: a busy member counts as
 * "unavailable" there whatever they marked, so scoring and the voter list
 * reflect it. Derived, never persisted — canceling the other session restores
 * the member's own mark.
 */
export function applyBusy(
  entries: AvailabilityEntry[],
  busy: BusyMap,
  roundId: string,
): AvailabilityEntry[] {
  if (busy.size === 0) return entries;
  const out: AvailabilityEntry[] = [];
  const covered = new Set<string>();
  const forced: AvailabilityStatus = "unavailable";
  for (const e of entries) {
    const cell = slotKeyId(e.date, e.timeSlot);
    if (busy.get(e.memberId)?.has(cell)) {
      covered.add(`${e.memberId}__${cell}`);
      out.push(e.status === forced ? e : { ...e, status: forced });
    } else {
      out.push(e);
    }
  }
  for (const [memberId, cells] of busy) {
    for (const [cell, info] of cells) {
      if (covered.has(`${memberId}__${cell}`)) continue;
      const [date, timeSlot] = cell.split("__") as [string, TimeSlot];
      out.push({
        id: `busy:${info.sessionId}:${memberId}`,
        roundId,
        memberId,
        date,
        timeSlot,
        status: forced,
        updatedAt: "",
      });
    }
  }
  return out;
}
