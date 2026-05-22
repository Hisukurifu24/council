"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ensureAccountCampaigns,
  ensureCampaign,
  getActiveRound,
  getCampaignByCode,
  getCurrentAccount,
  getEntriesForRound,
  getMembers,
  getMyCampaigns,
  getMyMemberId,
  getSessions,
  getSnapshot,
  getServerSnapshot,
  subscribe,
} from "./store";
import {
  recommend,
  scoreRound,
  SlotScore,
  Recommendation,
} from "./core/scoring";
import {
  AvailabilityEntry,
  Campaign,
  CampaignMember,
  SchedulingRound,
  Session,
  slotKeyId,
  TIME_SLOTS,
  AvailabilityStatus,
} from "./core/types";
import type { AuthSession } from "./auth";
import { rollingDates, addDaysISO, todayISO, isSlotPast } from "./utils";

/** Subscribe to the whole store; re-renders on any change (local or cross-tab). */
export function useDb() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** True after the component has mounted on the client — gates localStorage reads. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Loads a campaign (and its round/members/entries/sessions) by invite code
 * from Supabase and subscribes to realtime updates.
 * Returns true while the initial load is in flight.
 */
export function useEnsureCampaign(code: string): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    ensureCampaign(code).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [code]);
  return loading;
}

/** Loads the signed-in account's campaigns into the store. */
export function useEnsureMyCampaigns() {
  useEffect(() => {
    void ensureAccountCampaigns();
  }, []);
}

/** The currently logged-in account session, or null. Re-renders on auth change. */
export function useCurrentAccount(): AuthSession | null {
  useDb();
  const mounted = useMounted();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (mounted ? getCurrentAccount() : null), [mounted, getSnapshot()]);
}

export interface CampaignBundle {
  campaign?: Campaign;
  members: CampaignMember[];
  round?: SchedulingRound;
  entries: AvailabilityEntry[];
  sessions: Session[];
  myMemberId: string | null;
}

export function useCampaign(code: string): CampaignBundle {
  useDb(); // re-render on change
  return useMemo<CampaignBundle>(() => {
    const campaign = getCampaignByCode(code);
    if (!campaign) {
      return { members: [], entries: [], sessions: [], myMemberId: null };
    }
    const realRound = getActiveRound(campaign.id);
    const sessions = getSessions(campaign.id);

    // Advance the rolling window to start the day after the most recent
    // non-canceled session, so confirmed dates disappear from the grid and
    // the DM can't accidentally re-book the same slot.
    const lastActive = sessions
      .filter((s) => s.status !== "canceled")
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const today = todayISO();
    const windowStart =
      lastActive && lastActive.date >= today
        ? addDaysISO(lastActive.date, 1)
        : today;

    // Display a rolling window regardless of when the round was created,
    // so the planner never expires. Entries keep their real round id.
    const round: SchedulingRound | undefined = realRound
      ? {
          ...realRound,
          dates: rollingDates(35, windowStart),
          timeSlots: realRound.timeSlots?.length
            ? realRound.timeSlots
            : [...TIME_SLOTS],
        }
      : undefined;
    return {
      campaign,
      members: getMembers(campaign.id),
      round,
      entries: realRound ? getEntriesForRound(realRound.id) : [],
      sessions,
      myMemberId: getMyMemberId(campaign.id),
    };
    // recompute when the snapshot identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, getSnapshot()]);
}

export function useMyCampaigns(): Campaign[] {
  useDb();
  const mounted = useMounted();
  return useMemo(() => (mounted ? getMyCampaigns() : []), [mounted, getSnapshot()]); // eslint-disable-line react-hooks/exhaustive-deps
}

export interface ScoreModel {
  scores: SlotScore[];
  byCell: Map<string, SlotScore>;
  recommendations: Recommendation[];
  minPlayers: number;
  bestId?: string;
  backupId?: string;
  avoidId?: string;
}

export function useScores(bundle: CampaignBundle): ScoreModel {
  const { campaign, round, members, entries } = bundle;
  return useMemo<ScoreModel>(() => {
    if (!round || !campaign) {
      return { scores: [], byCell: new Map(), recommendations: [], minPlayers: 0 };
    }
    const minPlayers = campaign.settings.minPlayers ?? 1;
    const scores = scoreRound({
      round,
      members,
      entries,
      hostMemberId: campaign.hostId,
      weights: campaign.settings.weights,
    });
    const byCell = new Map<string, SlotScore>();
    for (const s of scores) byCell.set(slotKeyId(s.date, s.timeSlot), s);

    // Recommendations (and the grid's crown/star markers derived from them)
    // must ignore past slots, so they never point at a dimmed, unbookable cell.
    const futureScores = scores.filter((s) => !isSlotPast(s.date, s.timeSlot));
    const recommendations = recommend(futureScores, minPlayers);
    const find = (k: Recommendation["kind"]) => {
      const r = recommendations.find((x) => x.kind === k);
      return r ? slotKeyId(r.slot.date, r.slot.timeSlot) : undefined;
    };
    return {
      scores,
      byCell,
      recommendations,
      minPlayers,
      bestId: find("best"),
      backupId: find("backup"),
      avoidId: find("avoid"),
    };
  }, [campaign, round, members, entries]);
}

/** Lookup helper: a member's status for a given cell. */
export function statusFor(
  entries: AvailabilityEntry[],
  memberId: string | null,
  date: string,
  timeSlot: string,
): AvailabilityStatus | undefined {
  if (!memberId) return undefined;
  return entries.find(
    (e) =>
      e.memberId === memberId && e.date === date && e.timeSlot === timeSlot,
  )?.status;
}
