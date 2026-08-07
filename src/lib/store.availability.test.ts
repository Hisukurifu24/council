/**
 * Availability reconciliation: replays the tap -> Supabase write -> Realtime
 * echo sequence using the exact timestamp formats involved — Postgres renders
 * `+00:00` and trims trailing zeros, while the client sends `new Date()
 * .toISOString()` (`Z`). The two do not compare correctly as strings.
 */
import { beforeAll, describe, expect, it } from "vitest";

// store.hydrate() bails without a window; environment is "node".
(globalThis as unknown as { window: unknown }).window = globalThis;

import type { AvailabilityEntry, CampaignMember } from "./core/types";
import type { Backend, StoreApi } from "./backends/types";

let store: typeof import("./store");
let api: StoreApi;

const ROUND = "round-1";
const MEMBER = "member-1";
const DATE = "2026-08-20";
const SLOT = "evening" as const;

/** Mimics Postgres: renders timestamptz as +00:00 and trims trailing zeros. */
function asPgTimestamp(iso: string): string {
  return iso.replace(/\.?0*Z$/, (m) => (m === "Z" ? "" : m.slice(0, -1))) + "+00:00";
}

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
  /** Echo back what Postgres would return, like Realtime does. */
  persistSetAvailability = async (entry: AvailabilityEntry, _m?: CampaignMember) => {
    echoes.push({ ...entry, updatedAt: asPgTimestamp(entry.updatedAt) });
  };
  persistSetAvailabilityBulk = noop;
  persistConfirmSession = noop;
  persistCancelSession = noop;
  reset() {}
}

let echoes: AvailabilityEntry[] = [];

function currentStatus() {
  const s = store.getSnapshot();
  return s.availability[store.avKey(ROUND, MEMBER, DATE, SLOT)]?.status;
}

beforeAll(async () => {
  store = await import("./store");
  store.hydrate(() => new FakeBackend());
});

describe("availability echo reconciliation", () => {
  it("A. a tap survives its own Realtime echo", async () => {
    echoes = [];
    store.setAvailability(ROUND, MEMBER, DATE, SLOT, "available");
    expect(currentStatus()).toBe("available"); // optimistic
    await new Promise((r) => setTimeout(r, 0));
    echoes.forEach((e) => api.upsertAvailability(e)); // Realtime replays it
    expect(currentStatus()).toBe("available");
  });

  it("B. a second tap after the first echo lands is applied", async () => {
    echoes = [];
    store.setAvailability(ROUND, MEMBER, DATE, SLOT, "available");
    await new Promise((r) => setTimeout(r, 0));
    echoes.forEach((e) => api.upsertAvailability(e));
    echoes = [];

    store.setAvailability(ROUND, MEMBER, DATE, SLOT, "maybe");
    expect(currentStatus()).toBe("maybe");
  });

  it("C. a tap wins over a row stamped ahead of this device's clock", () => {
    // The user's other device runs 5 minutes fast; its row seeded the snapshot.
    const future = new Date(Date.now() + 5 * 60_000).toISOString();
    api.upsertAvailability({
      id: "other-device",
      roundId: ROUND,
      memberId: MEMBER,
      date: DATE,
      timeSlot: SLOT,
      status: "unavailable",
      updatedAt: asPgTimestamp(future),
    });
    expect(currentStatus()).toBe("unavailable");

    store.setAvailability(ROUND, MEMBER, DATE, SLOT, "available");
    expect(currentStatus()).toBe("available"); // the user's own tap must show
  });

  it("D. a delayed echo of an earlier tap does not revert the cell", async () => {
    echoes = [];
    store.setAvailability(ROUND, MEMBER, DATE, SLOT, "available");
    await new Promise((r) => setTimeout(r, 0));
    const stale = echoes[0]; // echo of the first tap, held back by the network

    echoes = [];
    store.setAvailability(ROUND, MEMBER, DATE, SLOT, "unavailable");
    await new Promise((r) => setTimeout(r, 0));

    api.upsertAvailability(stale); // arrives late, out of order
    expect(currentStatus()).toBe("unavailable");
  });
});
