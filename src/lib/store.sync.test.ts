/**
 * Cross-campaign availability: a mark made in one campaign is written to the
 * same account's membership in every other campaign, and loading reconciles
 * campaigns that drifted apart.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

// store.hydrate() bails without a window; environment is "node".
(globalThis as unknown as { window: unknown }).window = globalThis;
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

import type { AvailabilityEntry, CampaignMember, SchedulingRound } from "./core/types";
import type { Backend, StoreApi } from "./backends/types";
import { addDaysISO, todayISO } from "./utils";

let store: typeof import("./store");
let api: StoreApi;
let written: AvailabilityEntry[] = [];

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
  persistUpdateCampaign = noop;
  persistDeleteCampaign = noop;
  persistJoinMember = noop;
  persistUpdateMember = noop;
  persistRemoveMember = noop;
  persistSetAvailability = async (e: AvailabilityEntry) => {
    written.push(e);
  };
  persistSetAvailabilityBulk = async (es: AvailabilityEntry[]) => {
    written.push(...es);
  };
  persistConfirmSession = noop;
  persistCancelSession = noop;
  reset() {}
}

const DATE = addDaysISO(todayISO(), 3);

const member = (id: string, campaignId: string, accountId: string | null): CampaignMember => ({
  id,
  campaignId,
  accountId,
  guestName: id,
  role: "player",
  color: "#fff",
  joinedAt: "2026-01-01T00:00:00Z",
});
const round = (id: string, campaignId: string): SchedulingRound => ({
  id,
  campaignId,
  title: "Availability",
  dates: [],
  timeSlots: ["morning", "afternoon", "evening"],
  status: "active",
  createdAt: "2026-01-01T00:00:00Z",
});

const tick = () => new Promise((r) => setTimeout(r, 0));

function status(roundId: string, memberId: string) {
  return store.getSnapshot().availability[store.avKey(roundId, memberId, DATE, "evening")]
    ?.status;
}

beforeAll(async () => {
  store = await import("./store");
  store.hydrate(() => new FakeBackend());
});

beforeEach(() => {
  store.resetStore();
  written = [];
  localStorage.setItem(
    "dndtime:auth",
    JSON.stringify({ id: "me", email: "me@x", displayName: "Me" }),
  );
  api.upsertMember(member("a-me", "A", "me"));
  api.upsertMember(member("b-me", "B", "me"));
  api.upsertMember(member("a-friend", "A", "friend"));
  api.upsertMember(member("b-friend", "B", "friend"));
  api.upsertRound(round("rA", "A"));
  api.upsertRound(round("rB", "B"));
});

describe("cross-campaign availability", () => {
  it("a tap in one campaign is written to all of the account's campaigns", async () => {
    store.setAvailability("rA", "a-me", DATE, "evening", "available");
    expect(status("rA", "a-me")).toBe("available");
    expect(status("rB", "b-me")).toBe("available");
    await tick(); // writes are queued per cell
    expect(written.map((e) => e.roundId).sort()).toEqual(["rA", "rB"]);
    // Other people's rows are untouched.
    expect(status("rB", "b-friend")).toBeUndefined();
  });

  it("bulk marking fans out too", () => {
    store.setAvailabilityBulk("rB", "b-me", [{ date: DATE, timeSlot: "evening" }], "maybe");
    expect(status("rA", "a-me")).toBe("maybe");
    expect(status("rB", "b-me")).toBe("maybe");
  });

  it("a guest without an account only writes its own round", async () => {
    api.upsertMember(member("a-guest", "A", null));
    store.setAvailability("rA", "a-guest", DATE, "evening", "available");
    await tick();
    expect(written).toHaveLength(1);
  });

  it("reconcile copies the newest mark across campaigns", () => {
    api.upsertAvailability({
      id: "1",
      roundId: "rA",
      memberId: "a-me",
      date: DATE,
      timeSlot: "evening",
      status: "unavailable",
      updatedAt: "2026-11-01T00:00:00Z",
    });
    store.reconcileMyAvailability();
    expect(status("rB", "b-me")).toBe("unavailable");
    expect(written).toHaveLength(1);

    written = [];
    store.reconcileMyAvailability(); // already in sync
    expect(written).toHaveLength(0);
  });
});
