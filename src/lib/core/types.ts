// Framework-agnostic domain types. Shared by the UI, the local store,
// the Supabase adapter, and (future) the Discord bot / edge functions.

export type TimeSlot = "morning" | "afternoon" | "evening";

export const TIME_SLOTS: TimeSlot[] = ["morning", "afternoon", "evening"];

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export type AvailabilityStatus = "available" | "maybe" | "unavailable";

export type MemberRole = "dm" | "player";

export interface Account {
  id: string;
  email: string; // stored lowercased
  passwordHash: string;
  displayName: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  hostId: string; // member id of the DM
  inviteCode: string;
  timezone: string;
  settings: CampaignSettings;
  archivedAt?: string | null;
  createdAt: string;
}

export interface CampaignSettings {
  weights: ScoringWeights;
  timeSlots: TimeSlot[];
  minPlayers: number; // min available players (excluding the DM) for a viable session
}

export interface ScoringWeights {
  available: number;
  maybe: number;
  unavailable: number;
  hostBonus: number; // extra weight applied when the DM is available
}

export interface CampaignMember {
  id: string;
  campaignId: string;
  guestName?: string | null;
  accountId?: string | null; // links this membership to a logged-in account
  role: MemberRole;
  color: string;
  joinedAt: string;
}

export interface SchedulingRound {
  id: string;
  campaignId: string;
  title: string;
  dates: string[]; // ISO yyyy-mm-dd, shown vertically
  timeSlots: TimeSlot[];
  status: "active" | "archived";
  createdAt: string;
}

export interface AvailabilityEntry {
  id: string;
  roundId: string;
  memberId: string;
  date: string; // yyyy-mm-dd
  timeSlot: TimeSlot;
  status: AvailabilityStatus;
  updatedAt: string;
}

export interface Session {
  id: string;
  campaignId: string;
  roundId?: string | null;
  date: string;
  timeSlot: TimeSlot;
  status: "confirmed" | "tentative" | "canceled";
  notes?: string;
  locked: boolean;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
}

// A unique cell in the availability grid.
export interface SlotKey {
  date: string;
  timeSlot: TimeSlot;
}

export function slotKeyId(date: string, timeSlot: TimeSlot): string {
  return `${date}__${timeSlot}`;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  available: 2,
  maybe: 1,
  unavailable: -2,
  hostBonus: 1,
};

export const DEFAULT_MIN_PLAYERS = 2;
