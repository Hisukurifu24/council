import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import {
  Campaign,
  CampaignMember,
  AvailabilityEntry,
  SchedulingRound,
  Session,
} from "../core/types";
import {
  MEMBER_COLUMNS,
  campaignToRow,
  entryToRow,
  memberToRow,
  roundToRow,
  rowToCampaign,
  rowToEntry,
  rowToMember,
  rowToRound,
  rowToSession,
  sessionToRow,
} from "../supabase/mappers";
import { Backend, StoreApi } from "./types";

/**
 * Supabase backend: Postgres source of truth + Realtime reconciliation.
 *
 * No accounts. Everyone reads and writes through the public anon client; the
 * unguessable invite code is the access control (RLS policies are permissive).
 * "Only the DM confirms" is enforced in the UI, which is fine for a private
 * friends app.
 */
export class SupabaseBackend implements Backend {
  private api!: StoreApi;
  private sb: SupabaseClient | null = null;
  private subscribed = new Set<string>();

  init(api: StoreApi) {
    this.api = api;
    this.sb = getSupabase();
  }

  start() {
    /* per-campaign channels are opened lazily in ensureCampaign */
  }

  // ---- loaders -------------------------------------------------------------

  async ensureCampaign(code: string) {
    const sb = this.sb;
    if (!sb || !code) return;
    const { data: cRow } = await sb
      .from("campaigns")
      .select("*")
      .eq("invite_code", code.toUpperCase())
      .maybeSingle();
    if (!cRow) return;
    const campaign = rowToCampaign(cRow);
    this.api.upsertCampaign(campaign);

    const [{ data: members }, { data: rounds }, { data: sessions }] =
      await Promise.all([
        sb.from("campaign_members").select(MEMBER_COLUMNS).eq("campaign_id", campaign.id),
        sb
          .from("scheduling_rounds")
          .select("*")
          .eq("campaign_id", campaign.id)
          .eq("status", "active"),
        sb.from("sessions").select("*").eq("campaign_id", campaign.id),
      ]);

    members?.forEach((m) => this.api.upsertMember(rowToMember(m)));
    const round = rounds?.[0] ? rowToRound(rounds[0]) : undefined;
    if (round) {
      this.api.upsertRound(round);
      const { data: entries } = await sb
        .from("availability_entries")
        .select("*")
        .eq("round_id", round.id);
      entries?.forEach((e) => this.api.upsertAvailability(rowToEntry(e)));
    }
    sessions?.forEach((s) => this.api.upsertSession(rowToSession(s)));

    this.subscribeCampaign(campaign.id, round?.id);
  }

  async ensureMyCampaigns() {
    const sb = this.sb;
    if (!sb) return;
    const ids = this.api.getKnownCampaignIds();
    if (ids.length === 0) return;

    const [{ data: campaigns }, { data: members }, { data: sessions }] =
      await Promise.all([
        sb.from("campaigns").select("*").in("id", ids),
        sb.from("campaign_members").select(MEMBER_COLUMNS).in("campaign_id", ids),
        sb.from("sessions").select("*").in("campaign_id", ids),
      ]);
    campaigns?.forEach((c) => this.api.upsertCampaign(rowToCampaign(c)));
    members?.forEach((m) => this.api.upsertMember(rowToMember(m)));
    sessions?.forEach((s) => this.api.upsertSession(rowToSession(s)));
  }

  // ---- realtime ------------------------------------------------------------

  private subscribeCampaign(campaignId: string, roundId?: string) {
    const sb = this.sb;
    if (!sb || this.subscribed.has(campaignId)) return;
    this.subscribed.add(campaignId);

    const ch = sb.channel(`campaign:${campaignId}`);

    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "campaign_members", filter: `campaign_id=eq.${campaignId}` },
      (p) => {
        if (p.eventType === "DELETE") this.api.removeMember((p.old as { id: string }).id);
        else this.api.upsertMember(rowToMember(p.new));
      },
    );
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "sessions", filter: `campaign_id=eq.${campaignId}` },
      (p) => p.new && this.api.upsertSession(rowToSession(p.new)),
    );
    if (roundId) {
      ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability_entries", filter: `round_id=eq.${roundId}` },
        (p) => p.new && this.api.upsertAvailability(rowToEntry(p.new)),
      );
    }
    ch.subscribe();
  }

  // ---- writes (all direct via the anon client) -----------------------------

  async persistCreateCampaign(
    campaign: Campaign,
    host: CampaignMember,
    round: SchedulingRound,
  ) {
    const sb = this.sb;
    if (!sb) return;
    await sb.from("campaigns").insert(campaignToRow(campaign));
    await sb.from("campaign_members").insert(memberToRow(host));
    await sb.from("scheduling_rounds").insert(roundToRow(round));
    this.subscribeCampaign(campaign.id, round.id);
  }

  async persistJoinMember(member: CampaignMember) {
    const sb = this.sb;
    if (!sb) return;
    await sb.from("campaign_members").insert(memberToRow(member));
    this.subscribeCampaign(member.campaignId);
  }

  async persistSetAvailability(entry: AvailabilityEntry) {
    const sb = this.sb;
    if (!sb) return;
    await sb
      .from("availability_entries")
      .upsert(entryToRow(entry), { onConflict: "round_id,member_id,date,time_slot" });
  }

  async persistConfirmSession(session: Session) {
    const sb = this.sb;
    if (!sb) return;
    await sb.from("sessions").insert(sessionToRow(session));
  }

  reset() {
    /* no-op: server data is shared and not wiped from a client */
  }
}
