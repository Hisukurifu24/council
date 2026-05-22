import { describe, expect, it } from "vitest";
import { recommend, rankSlots, scoreRound, heatToIntensity } from "./scoring";
import {
  AvailabilityEntry,
  CampaignMember,
  DEFAULT_WEIGHTS,
  TimeSlot,
} from "./types";

function member(id: string, role: "dm" | "player" = "player"): CampaignMember {
  return {
    id,
    campaignId: "c1",
    guestName: id,
    role,
    color: "#fff",
    joinedAt: "2026-01-01T00:00:00Z",
  };
}

function entry(
  memberId: string,
  date: string,
  timeSlot: TimeSlot,
  status: AvailabilityEntry["status"],
): AvailabilityEntry {
  return {
    id: `${memberId}-${date}-${timeSlot}`,
    roundId: "r1",
    memberId,
    date,
    timeSlot,
    status,
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

const round = {
  dates: ["2026-05-22", "2026-05-23"],
  timeSlots: ["morning", "afternoon", "evening"] as TimeSlot[],
};

describe("scoreRound", () => {
  it("counts available / maybe / unavailable and computes potential", () => {
    const members = [member("a"), member("b"), member("c"), member("d")];
    const entries = [
      entry("a", "2026-05-22", "evening", "available"),
      entry("b", "2026-05-22", "evening", "available"),
      entry("c", "2026-05-22", "evening", "maybe"),
      entry("d", "2026-05-22", "evening", "unavailable"),
    ];
    const scores = scoreRound({ round, members, entries });
    const cell = scores.find(
      (s) => s.date === "2026-05-22" && s.timeSlot === "evening",
    )!;

    expect(cell.available).toBe(2);
    expect(cell.maybe).toBe(1);
    expect(cell.unavailable).toBe(1);
    expect(cell.potential).toBe(3); // 2 available + 1 maybe
    expect(cell.total).toBe(4);
    expect(cell.noResponse).toBe(0);
    // score = 2*2 + 1*1 + 1*(-2) = 3
    expect(cell.score).toBe(3);
    // heat includes maybes: (2+1)/4
    expect(cell.heat).toBeCloseTo(0.75);
  });

  it("counts no-response when members have not voted", () => {
    const members = [member("a"), member("b"), member("c")];
    const entries = [entry("a", "2026-05-23", "morning", "available")];
    const scores = scoreRound({ round, members, entries });
    const cell = scores.find(
      (s) => s.date === "2026-05-23" && s.timeSlot === "morning",
    )!;
    expect(cell.available).toBe(1);
    expect(cell.noResponse).toBe(2);
  });

  it("counts playersAvailable excluding the DM", () => {
    const members = [member("dm", "dm"), member("p1"), member("p2")];
    const cell = scoreRound({
      round,
      members,
      hostMemberId: "dm",
      entries: [
        entry("dm", "2026-05-22", "evening", "available"),
        entry("p1", "2026-05-22", "evening", "available"),
        entry("p2", "2026-05-22", "evening", "available"),
      ],
    }).find((s) => s.date === "2026-05-22" && s.timeSlot === "evening")!;

    expect(cell.available).toBe(3); // includes the DM
    expect(cell.playersAvailable).toBe(2); // excludes the DM
    expect(cell.playersViable).toBe(2); // same when no maybes
  });

  it("applies the host availability bonus", () => {
    const members = [member("dm", "dm"), member("p1")];
    const base = scoreRound({
      round,
      members,
      entries: [entry("p1", "2026-05-22", "evening", "available")],
    }).find((s) => s.date === "2026-05-22" && s.timeSlot === "evening")!;

    const withHost = scoreRound({
      round,
      members,
      hostMemberId: "dm",
      entries: [
        entry("p1", "2026-05-22", "evening", "available"),
        entry("dm", "2026-05-22", "evening", "available"),
      ],
    }).find((s) => s.date === "2026-05-22" && s.timeSlot === "evening")!;

    // host present adds available weight (2) + hostBonus (1) vs base
    expect(withHost.score).toBe(base.score + DEFAULT_WEIGHTS.available + DEFAULT_WEIGHTS.hostBonus);
  });
});

describe("rankSlots", () => {
  it("orders by score, breaking ties by fewest unavailable", () => {
    const members = [member("a"), member("b"), member("c")];
    const entries = [
      // Thu evening: 2 available
      entry("a", "2026-05-22", "evening", "available"),
      entry("b", "2026-05-22", "evening", "available"),
      // Fri evening: 2 available + 1 unavailable (same available, more unavailable)
      entry("a", "2026-05-23", "evening", "available"),
      entry("b", "2026-05-23", "evening", "available"),
      entry("c", "2026-05-23", "evening", "unavailable"),
    ];
    const ranked = rankSlots(scoreRound({ round, members, entries }));
    expect(ranked[0].date).toBe("2026-05-22"); // higher score, no unavailable
  });
});

describe("recommend", () => {
  it("returns best on a top slot and backup on a different date", () => {
    const members = [member("a"), member("b"), member("c")];
    const entries = [
      entry("a", "2026-05-22", "evening", "available"),
      entry("b", "2026-05-22", "evening", "available"),
      entry("c", "2026-05-22", "evening", "available"),
      entry("a", "2026-05-23", "afternoon", "available"),
      entry("b", "2026-05-23", "afternoon", "available"),
    ];
    const recs = recommend(scoreRound({ round, members, entries }));
    const best = recs.find((r) => r.kind === "best")!;
    const backup = recs.find((r) => r.kind === "backup")!;
    expect(best.slot.date).toBe("2026-05-22");
    expect(best.slot.available).toBe(3);
    expect(backup.slot.date).toBe("2026-05-23");
  });

  it("flags an avoid slot when one is clearly bad", () => {
    const members = [member("a"), member("b"), member("c")];
    const entries = [
      entry("a", "2026-05-22", "evening", "available"),
      entry("b", "2026-05-22", "evening", "available"),
      entry("c", "2026-05-22", "evening", "available"),
      // a clearly bad slot: everyone unavailable
      entry("a", "2026-05-23", "morning", "unavailable"),
      entry("b", "2026-05-23", "morning", "unavailable"),
      entry("c", "2026-05-23", "morning", "unavailable"),
    ];
    const recs = recommend(scoreRound({ round, members, entries }));
    const avoid = recs.find((r) => r.kind === "avoid");
    expect(avoid).toBeTruthy();
    expect(avoid!.slot.unavailable).toBe(3);
  });

  it("returns nothing when there are no members", () => {
    expect(recommend(scoreRound({ round, members: [], entries: [] }))).toEqual(
      [],
    );
  });

  it("requires minPlayers available (excluding the DM) for a viable slot", () => {
    const members = [member("dm", "dm"), member("p1"), member("p2")];
    const scores = scoreRound({
      round,
      members,
      hostMemberId: "dm",
      entries: [
        entry("dm", "2026-05-22", "evening", "available"),
        entry("p1", "2026-05-22", "evening", "available"),
        entry("p2", "2026-05-22", "evening", "available"),
      ],
    });

    // 2 players available (DM excluded): meets a threshold of 2, not 3.
    expect(recommend(scores, 2).some((r) => r.kind === "best")).toBe(true);
    expect(recommend(scores, 3)).toEqual([]);
  });

  it("counts maybe toward the minPlayers viability threshold", () => {
    const members = [member("dm", "dm"), member("p1"), member("p2")];
    const scores = scoreRound({
      round,
      members,
      hostMemberId: "dm",
      entries: [
        entry("dm", "2026-05-22", "evening", "available"),
        entry("p1", "2026-05-22", "evening", "maybe"),
        entry("p2", "2026-05-22", "evening", "maybe"),
      ],
    });
    // 0 strictly available players, but 2 viable (maybe) — meets threshold of 2.
    const cell = scores.find(
      (s) => s.date === "2026-05-22" && s.timeSlot === "evening",
    )!;
    expect(cell.playersAvailable).toBe(0);
    expect(cell.playersViable).toBe(2);
    expect(recommend(scores, 2).some((r) => r.kind === "best")).toBe(true);
  });

  it("blocks a slot from recommendation when the DM is unavailable", () => {
    const members = [member("dm", "dm"), member("p1"), member("p2")];
    const scores = scoreRound({
      round,
      members,
      hostMemberId: "dm",
      entries: [
        entry("dm", "2026-05-22", "evening", "unavailable"),
        entry("p1", "2026-05-22", "evening", "available"),
        entry("p2", "2026-05-22", "evening", "available"),
      ],
    });
    const cell = scores.find(
      (s) => s.date === "2026-05-22" && s.timeSlot === "evening",
    )!;
    expect(cell.dmOk).toBe(false);
    // Every other slot has no DM entry, so the DM hasn't engaged → also blocked.
    expect(recommend(scores, 1)).toEqual([]);
  });

  it("blocks a slot when the DM has not responded", () => {
    const members = [member("dm", "dm"), member("p1"), member("p2")];
    const scores = scoreRound({
      round,
      members,
      hostMemberId: "dm",
      entries: [
        entry("p1", "2026-05-22", "evening", "available"),
        entry("p2", "2026-05-22", "evening", "available"),
      ],
    });
    const cell = scores.find(
      (s) => s.date === "2026-05-22" && s.timeSlot === "evening",
    )!;
    expect(cell.dmOk).toBe(false);
    expect(recommend(scores, 2)).toEqual([]);
  });

  it("allows a slot when the DM is only 'maybe'", () => {
    const members = [member("dm", "dm"), member("p1"), member("p2")];
    const scores = scoreRound({
      round,
      members,
      hostMemberId: "dm",
      entries: [
        entry("dm", "2026-05-22", "evening", "maybe"),
        entry("p1", "2026-05-22", "evening", "available"),
        entry("p2", "2026-05-22", "evening", "available"),
      ],
    });
    const cell = scores.find(
      (s) => s.date === "2026-05-22" && s.timeSlot === "evening",
    )!;
    expect(cell.dmOk).toBe(true);
    expect(recommend(scores, 2).some((r) => r.kind === "best")).toBe(true);
  });

  it("does not count the DM toward the minPlayers threshold", () => {
    const members = [member("dm", "dm"), member("p1")];
    const scores = scoreRound({
      round,
      members,
      hostMemberId: "dm",
      entries: [
        entry("dm", "2026-05-22", "evening", "available"),
        entry("p1", "2026-05-22", "evening", "available"),
      ],
    });
    // Only 1 real player free, so a threshold of 2 yields no recommendation.
    expect(recommend(scores, 1).some((r) => r.kind === "best")).toBe(true);
    expect(recommend(scores, 2)).toEqual([]);
  });
});

describe("heatToIntensity", () => {
  it("buckets heat into 0..5", () => {
    expect(heatToIntensity(0)).toBe(0);
    expect(heatToIntensity(0.2)).toBe(1);
    expect(heatToIntensity(0.5)).toBe(3);
    expect(heatToIntensity(1)).toBe(5);
  });
});
