import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "../supabase/client";
import {
  Account,
  Campaign,
  CampaignMember,
  AvailabilityEntry,
  SchedulingRound,
  Session,
} from "../core/types";
import {
  MEMBER_COLUMNS,
  accountToRow,
  campaignToRow,
  entryToRow,
  memberToRow,
  roundToRow,
  rowToAccount,
  rowToCampaign,
  rowToEntry,
  rowToMember,
  rowToRound,
  rowToSession,
  sessionToRow,
} from "../supabase/mappers";
import { Backend, StoreApi } from "./types";

/**
 * Surface Supabase errors instead of silently swallowing them. Logs to the
 * console (so failed writes are visible) and throws so callers that care
 * (sign-up / log-in) can report it to the user.
 */
function check(label: string, error: { message?: string } | null): void {
  if (error) {
    // eslint-disable-next-line no-console
    console.error(`[supabase] ${label}:`, error.message ?? error);
    throw error;
  }
}

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

  async ensureAccountCampaigns(accountId: string) {
    const sb = this.sb;
    if (!sb || !accountId) return;
    const { data: myMembers } = await sb
      .from("campaign_members")
      .select("campaign_id")
      .eq("account_id", accountId);
    const ids = Array.from(
      new Set((myMembers ?? []).map((m: { campaign_id: string }) => m.campaign_id)),
    );
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

  // ---- accounts ------------------------------------------------------------

  async findAccountByEmail(email: string): Promise<Account | null> {
    const sb = this.sb;
    if (!sb) return null;
    const { data, error } = await sb
      .from("accounts")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    check("findAccountByEmail", error);
    return data ? rowToAccount(data) : null;
  }

  async persistAccount(account: Account) {
    const sb = this.sb;
    if (!sb) return;
    const { error } = await sb.from("accounts").upsert(accountToRow(account));
    check("persistAccount", error);
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
    check(
      "insert campaign",
      (await sb.from("campaigns").insert(campaignToRow(campaign))).error,
    );
    check(
      "insert host member",
      (await sb.from("campaign_members").insert(memberToRow(host))).error,
    );
    check(
      "insert round",
      (await sb.from("scheduling_rounds").insert(roundToRow(round))).error,
    );
    this.subscribeCampaign(campaign.id, round.id);
  }

  async persistUpdateCampaign(campaign: Campaign) {
    const sb = this.sb;
    if (!sb) return;
    const { error } = await sb
      .from("campaigns")
      .update({
        name: campaign.name,
        description: campaign.description ?? null,
        settings: campaign.settings,
      })
      .eq("id", campaign.id);
    check("update campaign", error);
  }

  async persistDeleteCampaign(campaignId: string) {
    const sb = this.sb;
    if (!sb) return;
    // Child rows (members, rounds, availability, sessions) cascade on delete.
    const { error } = await sb.from("campaigns").delete().eq("id", campaignId);
    check("delete campaign", error);
    this.subscribed.delete(campaignId);
  }

  async persistJoinMember(member: CampaignMember) {
    const sb = this.sb;
    if (!sb) return;
    const { error } = await sb
      .from("campaign_members")
      .insert(memberToRow(member));
    check("insert member", error);
    this.subscribeCampaign(member.campaignId);
  }

  async persistSetAvailability(entry: AvailabilityEntry) {
    const sb = this.sb;
    if (!sb) return;
    const { error } = await sb
      .from("availability_entries")
      .upsert(entryToRow(entry), { onConflict: "round_id,member_id,date,time_slot" });
    check("upsert availability", error);
  }

  async persistSetAvailabilityBulk(entries: AvailabilityEntry[]) {
    const sb = this.sb;
    if (!sb || entries.length === 0) return;
    const { error } = await sb
      .from("availability_entries")
      .upsert(entries.map(entryToRow), {
        onConflict: "round_id,member_id,date,time_slot",
      });
    check("bulk upsert availability", error);
  }

  async persistConfirmSession(session: Session) {
    const sb = this.sb;
    if (!sb) return;
    const { error } = await sb.from("sessions").insert(sessionToRow(session));
    check("insert session", error);
  }

  reset() {
    /* no-op: server data is shared and not wiped from a client */
  }
}
