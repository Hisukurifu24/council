import {
  AvailabilityEntry,
  Campaign,
  CampaignMember,
  CampaignSettings,
  DEFAULT_WEIGHTS,
  SchedulingRound,
  Session,
  TimeSlot,
} from "../core/types";

// Row shapes returned by Supabase (snake_case). Kept loose on purpose.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function rowToCampaign(r: any): Campaign {
  const settings: CampaignSettings = {
    weights: r.settings?.weights ?? DEFAULT_WEIGHTS,
    timeSlots: (r.settings?.timeSlots ?? ["morning", "afternoon", "evening"]) as TimeSlot[],
  };
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? undefined,
    hostId: r.host_id,
    inviteCode: r.invite_code,
    timezone: r.timezone ?? "UTC",
    settings,
    archivedAt: r.archived_at ?? null,
    createdAt: r.created_at,
  };
}

export function campaignToRow(c: Campaign) {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    host_id: c.hostId,
    invite_code: c.inviteCode,
    timezone: c.timezone,
    settings: c.settings,
    archived_at: c.archivedAt ?? null,
    created_at: c.createdAt,
  };
}

export function rowToMember(r: any): CampaignMember {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    guestName: r.guest_name ?? null,
    role: r.role,
    color: r.color,
    joinedAt: r.joined_at,
  };
}

export function memberToRow(m: CampaignMember) {
  return {
    id: m.id,
    campaign_id: m.campaignId,
    guest_name: m.guestName ?? null,
    role: m.role,
    color: m.color,
    joined_at: m.joinedAt,
  };
}

export const MEMBER_COLUMNS =
  "id, campaign_id, guest_name, role, color, joined_at";

export function rowToRound(r: any): SchedulingRound {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    title: r.title,
    dates: r.dates ?? [],
    timeSlots: (r.time_slots ?? []) as TimeSlot[],
    status: r.status,
    createdAt: r.created_at,
  };
}

export function roundToRow(r: SchedulingRound) {
  return {
    id: r.id,
    campaign_id: r.campaignId,
    title: r.title,
    dates: r.dates,
    time_slots: r.timeSlots,
    status: r.status,
    created_at: r.createdAt,
  };
}

export function rowToEntry(r: any): AvailabilityEntry {
  return {
    id: r.id,
    roundId: r.round_id,
    memberId: r.member_id,
    date: r.date,
    timeSlot: r.time_slot,
    status: r.status,
    updatedAt: r.updated_at,
  };
}

export function entryToRow(e: AvailabilityEntry) {
  return {
    id: e.id,
    round_id: e.roundId,
    member_id: e.memberId,
    date: e.date,
    time_slot: e.timeSlot,
    status: e.status,
    updated_at: e.updatedAt,
  };
}

export function rowToSession(r: any): Session {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    roundId: r.round_id ?? null,
    date: r.date,
    timeSlot: r.time_slot,
    status: r.status,
    notes: r.notes ?? undefined,
    locked: r.locked,
    confirmedBy: r.confirmed_by ?? null,
    confirmedAt: r.confirmed_at ?? null,
    createdAt: r.created_at,
  };
}

export function sessionToRow(s: Session) {
  return {
    id: s.id,
    campaign_id: s.campaignId,
    round_id: s.roundId ?? null,
    date: s.date,
    time_slot: s.timeSlot,
    status: s.status,
    notes: s.notes ?? null,
    locked: s.locked,
    confirmed_by: s.confirmedBy ?? null,
    confirmed_at: s.confirmedAt ?? null,
    created_at: s.createdAt,
  };
}
