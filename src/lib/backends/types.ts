import {
  Account,
  AvailabilityEntry,
  Campaign,
  CampaignMember,
  SchedulingRound,
  Session,
} from "../core/types";
import type { DB } from "../store";

/** Surface the store hands to a backend so it can apply local + remote changes. */
export interface StoreApi {
  getSnapshot(): DB;
  setSnapshot(db: DB): void;
  upsertAccount(a: Account): void;
  upsertCampaign(c: Campaign): void;
  upsertMember(m: CampaignMember): void;
  upsertRound(r: SchedulingRound): void;
  upsertAvailability(e: AvailabilityEntry): void;
  upsertSession(s: Session): void;
  removeMember(id: string): void;
}

/**
 * A persistence + realtime backend. Mutations are already applied optimistically
 * to the snapshot by the store; persist* methods push them to the source of
 * truth and rely on realtime/broadcast to reconcile other clients.
 */
export interface Backend {
  init(api: StoreApi): void;
  start(): void;

  ensureCampaign(code: string): Promise<void>;
  ensureAccountCampaigns(accountId: string): Promise<void>;

  findAccountByEmail(email: string): Promise<Account | null>;
  persistAccount(account: Account): Promise<void>;

  persistCreateCampaign(
    campaign: Campaign,
    host: CampaignMember,
    round: SchedulingRound,
  ): Promise<void>;
  persistUpdateCampaign(campaign: Campaign): Promise<void>;
  persistJoinMember(member: CampaignMember): Promise<void>;
  persistSetAvailability(
    entry: AvailabilityEntry,
    member: CampaignMember | undefined,
  ): Promise<void>;
  persistConfirmSession(
    session: Session,
    dm: CampaignMember | undefined,
  ): Promise<void>;

  reset(): void;
}
