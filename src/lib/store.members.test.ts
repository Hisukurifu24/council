/**
 * DM member management: kick, ban/unban, and DM transfer, driven through the
 * store with a fake backend that records what would be written to Supabase.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// store.hydrate() bails without a window; environment is "node".
(globalThis as unknown as { window: unknown }).window = globalThis;
// Minimal Web Storage so getCurrentAccount() can read a session.
function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
Object.assign(globalThis, {
  localStorage: memoryStorage(),
  sessionStorage: memoryStorage(),
});

import type { Campaign, CampaignMember } from "./core/types";
import type { Backend, StoreApi } from "./backends/types";

let store: typeof import("./store");
let api: StoreApi;
let writes: string[] = [];

const noop = async () => {};
class FakeBackend implements Backend {
  init(a: StoreApi) {
    api = a;
  }
  start() {}
  ensureCampaign = noop;
  ensureAccountCampaigns = noop;
  findAccountByEmail = async () => null;
  persistAccount = noop;
  persistCreateCampaign = noop;
  persistUpdateCampaign = async (c: Campaign) => {
    writes.push(`campaign host=${c.hostId} banned=${c.settings.banned.map((b) => b.accountId)}`);
  };
  persistDeleteCampaign = noop;
  persistJoinMember = async (m: CampaignMember) => {
    writes.push(`join ${m.accountId}`);
  };
  persistUpdateMember = async (m: CampaignMember) => {
    writes.push(`member ${m.id} role=${m.role}`);
  };
  persistRemoveMember = async (id: string) => {
    writes.push(`remove ${id}`);
  };
  persistSetAvailability = noop;
  persistSetAvailabilityBulk = noop;
  persistConfirmSession = noop;
  persistCancelSession = noop;
  reset() {}
}

const C = "camp-1";
const ROUND = "round-1";

function member(id: string, role: "dm" | "player", accountId: string): CampaignMember {
  return { id, campaignId: C, guestName: id, accountId, role, color: "#fff", joinedAt: "2026-01-01T00:00:00Z" };
}

function logInAs(accountId: string) {
  localStorage.setItem(
    "dndtime:auth",
    JSON.stringify({ id: accountId, email: `${accountId}@x`, displayName: accountId }),
  );
}

beforeAll(async () => {
  store = await import("./store");
  store.hydrate(() => new FakeBackend());
});

beforeEach(() => {
  writes = [];
  api.setSnapshot({
    accounts: {},
    campaigns: {
      [C]: {
        id: C,
        name: "Test",
        hostId: "dm",
        inviteCode: "ABC",
        timezone: "UTC",
        settings: { weights: { available: 2, maybe: 1, unavailable: -2, hostBonus: 1 }, timeSlots: ["evening"], minPlayers: 1, banned: [] },
        createdAt: "2026-01-01T00:00:00Z",
      },
    },
    members: {
      dm: member("dm", "dm", "acct-dm"),
      p1: member("p1", "player", "acct-p1"),
    },
    rounds: {},
    availability: {},
    sessions: {},
  });
  store.setAvailability(ROUND, "p1", "2026-02-01", "evening", "available");
  logInAs("acct-dm");
});

const snap = () => store.getSnapshot();

describe("member management", () => {
  it("kick removes the member and their availability", () => {
    store.kickMember(C, "p1");
    expect(snap().members.p1).toBeUndefined();
    expect(Object.values(snap().availability).some((e) => e.memberId === "p1")).toBe(false);
    expect(writes).toContain("remove p1");
  });

  it("the DM can't be kicked or banned", () => {
    store.kickMember(C, "dm");
    store.banMember(C, "dm");
    expect(snap().members.dm).toBeDefined();
    expect(writes).toEqual([]);
  });

  it("a banned account can't rejoin until unbanned", () => {
    store.banMember(C, "p1");
    expect(snap().members.p1).toBeUndefined();
    expect(snap().campaigns[C].settings.banned.map((b) => b.accountId)).toEqual(["acct-p1"]);

    logInAs("acct-p1");
    expect(store.isBanned(C)).toBe(true);
    expect(store.joinAsGuest(C, "p1")).toBeNull();
    expect(writes).not.toContain("join acct-p1");

    store.unbanAccount(C, "acct-p1");
    expect(store.isBanned(C)).toBe(false);
    expect(store.joinAsGuest(C, "p1")).not.toBeNull();
    expect(writes).toContain("join acct-p1");
  });

  it("transferring the DM role swaps host and roles", () => {
    store.transferHost(C, "p1");
    expect(snap().campaigns[C].hostId).toBe("p1");
    expect(snap().members.p1.role).toBe("dm");
    expect(snap().members.dm.role).toBe("player");
    expect(writes).toEqual(
      expect.arrayContaining(["campaign host=p1 banned=", "member p1 role=dm", "member dm role=player"]),
    );
  });
});
