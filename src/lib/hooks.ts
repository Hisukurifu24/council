"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  ensureCampaign,
  ensureMyCampaigns,
  getActiveRound,
  getCampaignByCode,
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
  AvailabilityStatus,
} from "./core/types";

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
 * Loads a campaign (and its round/members/entries/sessions) by invite code.
 * No-op + instant in local mode; fetches + subscribes in Supabase mode.
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

/** Loads the signed-in user's campaigns (Supabase mode); no-op locally. */
export function useEnsureMyCampaigns() {
  useEffect(() => {
    void ensureMyCampaigns();
  }, []);
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
    const round = getActiveRound(campaign.id);
    return {
      campaign,
      members: getMembers(campaign.id),
      round,
      entries: round ? getEntriesForRound(round.id) : [],
      sessions: getSessions(campaign.id),
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
  bestId?: string;
  backupId?: string;
  avoidId?: string;
}

export function useScores(bundle: CampaignBundle): ScoreModel {
  const { campaign, round, members, entries } = bundle;
  return useMemo<ScoreModel>(() => {
    if (!round || !campaign) {
      return { scores: [], byCell: new Map(), recommendations: [] };
    }
    const scores = scoreRound({
      round,
      members,
      entries,
      hostMemberId: campaign.hostId,
      weights: campaign.settings.weights,
    });
    const byCell = new Map<string, SlotScore>();
    for (const s of scores) byCell.set(slotKeyId(s.date, s.timeSlot), s);

    const recommendations = recommend(scores);
    const find = (k: Recommendation["kind"]) => {
      const r = recommendations.find((x) => x.kind === k);
      return r ? slotKeyId(r.slot.date, r.slot.timeSlot) : undefined;
    };
    return {
      scores,
      byCell,
      recommendations,
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
