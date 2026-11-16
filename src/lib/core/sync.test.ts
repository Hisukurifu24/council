import { describe, expect, it } from "vitest";
import { applyBusy, busyCells, planAvailabilitySync } from "./sync";
import type { AvailabilityEntry, CampaignMember, Session } from "./types";

const entry = (
  roundId: string,
  memberId: string,
  date: string,
  status: AvailabilityEntry["status"],
  updatedAt: string,
): AvailabilityEntry => ({
  id: `${roundId}-${memberId}-${date}`,
  roundId,
  memberId,
  date,
  timeSlot: "evening",
  status,
  updatedAt,
});

const member = (id: string, campaignId: string, accountId: string | null): CampaignMember => ({
  id,
  campaignId,
  accountId,
  guestName: id,
  role: "player",
  color: "#fff",
  joinedAt: "2026-01-01T00:00:00Z",
});

const session = (
  id: string,
  campaignId: string,
  date: string,
  status: Session["status"] = "confirmed",
): Session => ({
  id,
  campaignId,
  date,
  timeSlot: "evening",
  status,
  locked: true,
  createdAt: "2026-01-01T00:00:00Z",
});

describe("planAvailabilitySync", () => {
  const targets = [
    { roundId: "rA", memberId: "mA" },
    { roundId: "rB", memberId: "mB" },
  ];

  it("copies a mark into campaigns that don't have it", () => {
    const out = planAvailabilitySync(
      targets,
      [entry("rA", "mA", "2026-12-01", "available", "2026-11-10T10:00:00Z")],
      "2026-11-16",
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      roundId: "rB",
      memberId: "mB",
      date: "2026-12-01",
      status: "available",
      updatedAt: "2026-11-10T10:00:00Z",
      id: "",
    });
  });

  it("the most recent mark wins, comparing instants not strings", () => {
    const out = planAvailabilitySync(
      targets,
      [
        entry("rA", "mA", "2026-12-01", "available", "2026-11-10T10:00:00Z"),
        entry("rB", "mB", "2026-12-01", "unavailable", "2026-11-10T10:00:01+00:00"),
      ],
      "2026-11-16",
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ roundId: "rA", status: "unavailable", id: "rA-mA-2026-12-01" });
  });

  it("is a no-op once campaigns agree, and on its own output", () => {
    const entries = [
      entry("rA", "mA", "2026-12-01", "maybe", "2026-11-10T10:00:00Z"),
      entry("rB", "mB", "2026-12-01", "available", "2026-11-11T10:00:00Z"),
    ];
    const first = planAvailabilitySync(targets, entries, "2026-11-16");
    const merged = [...entries.filter((e) => e.roundId !== "rA"), ...first];
    expect(planAvailabilitySync(targets, merged, "2026-11-16")).toEqual([]);
  });

  it("ignores past dates, other members, and single-campaign accounts", () => {
    const entries = [
      entry("rA", "mA", "2026-11-01", "available", "2026-10-01T00:00:00Z"),
      entry("rA", "someone", "2026-12-01", "available", "2026-10-01T00:00:00Z"),
    ];
    expect(planAvailabilitySync(targets, entries, "2026-11-16")).toEqual([]);
    expect(planAvailabilitySync(targets.slice(0, 1), entries, "2026-01-01")).toEqual([]);
  });
});

describe("busyCells", () => {
  const members = [
    member("b-ann", "B", "ann"),
    member("b-bob", "B", "bob"),
    member("b-guest", "B", null),
    member("a-ann", "A", "ann"),
    member("c-carl", "C", "carl"),
  ];

  it("marks members with a session in another campaign", () => {
    const busy = busyCells("B", members, [
      session("s1", "A", "2026-12-01"),
      session("s2", "C", "2026-12-02"), // carl isn't in B
      session("s3", "B", "2026-12-03"), // this campaign's own session
      session("s4", "A", "2026-12-04", "canceled"),
    ]);
    expect([...busy.keys()]).toEqual(["b-ann"]);
    expect(busy.get("b-ann")?.get("2026-12-01__evening")).toEqual({
      campaignId: "A",
      sessionId: "s1",
    });
    expect(busy.get("b-ann")?.size).toBe(1);
  });
});

describe("applyBusy", () => {
  const busy = new Map([
    ["m1", new Map([["2026-12-01__evening", { campaignId: "A", sessionId: "s1" }]])],
  ]);

  it("forces a busy member's mark to unavailable", () => {
    const out = applyBusy(
      [
        entry("r", "m1", "2026-12-01", "available", "t"),
        entry("r", "m2", "2026-12-01", "available", "t"),
      ],
      busy,
      "r",
    );
    expect(out.map((e) => [e.memberId, e.status])).toEqual([
      ["m1", "unavailable"],
      ["m2", "available"],
    ]);
  });

  it("adds an unavailable entry when the member hadn't marked the cell", () => {
    const out = applyBusy([], busy, "r");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      roundId: "r",
      memberId: "m1",
      date: "2026-12-01",
      timeSlot: "evening",
      status: "unavailable",
    });
  });
});
