import { describe, expect, it } from "vitest";
import { parseAvailabilitySpeech } from "./voice-parse";

// Fixed reference date: 2026-05-21 is a Thursday.
const TODAY = "2026-05-21";

// Build a 35-day rolling window starting today (mirrors rollingDates()).
function windowFrom(start: string, days = 35): string[] {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00");
  for (let i = 0; i < days; i++) {
    const c = new Date(d);
    c.setDate(c.getDate() + i);
    const iso = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}-${String(c.getDate()).padStart(2, "0")}`;
    out.push(iso);
  }
  return out;
}

const WINDOW = windowFrom(TODAY);
const parse = (t: string) =>
  parseAvailabilitySpeech(t, { today: TODAY, windowDates: WINDOW });

describe("parseAvailabilitySpeech", () => {
  it("parses a simple English phrase to one cell", () => {
    const r = parse("free saturday evening");
    expect(r.matched).toBe(true);
    expect(r.slots).toEqual([
      { date: "2026-05-23", timeSlot: "evening", status: "available" },
    ]);
  });

  it("parses a simple Italian phrase", () => {
    const r = parse("libero sabato sera");
    expect(r.slots).toEqual([
      { date: "2026-05-23", timeSlot: "evening", status: "available" },
    ]);
  });

  it("handles mixed statuses across clauses", () => {
    const r = parse("free next saturday evening but busy sunday afternoon");
    expect(r.slots).toEqual([
      { date: "2026-05-24", timeSlot: "afternoon", status: "unavailable" },
      { date: "2026-05-30", timeSlot: "evening", status: "available" },
    ]);
  });

  it("resolves 'next <weekday>' to the following week", () => {
    // bare saturday → 05-23; next saturday → 05-30
    expect(parse("free saturday").slots[0].date).toBe("2026-05-23");
    expect(parse("free next saturday").slots[0].date).toBe("2026-05-30");
  });

  it("defaults to all three slots when no time is mentioned", () => {
    const r = parse("busy monday");
    expect(r.slots.map((s) => s.timeSlot)).toEqual([
      "morning",
      "afternoon",
      "evening",
    ]);
    expect(r.slots.every((s) => s.status === "unavailable")).toBe(true);
    expect(r.slots.every((s) => s.date === "2026-05-25")).toBe(true);
  });

  it("understands day-of-month ('the 24th')", () => {
    const r = parse("available on the 24th in the afternoon");
    expect(r.slots).toEqual([
      { date: "2026-05-24", timeSlot: "afternoon", status: "available" },
    ]);
  });

  it("understands explicit month + day ('may 24')", () => {
    expect(parse("free may 24 evening").slots).toEqual([
      { date: "2026-05-24", timeSlot: "evening", status: "available" },
    ]);
  });

  it("expands 'next week' to seven days", () => {
    const r = parse("free next week morning");
    expect(r.slots).toHaveLength(7);
    expect(r.slots[0].date).toBe("2026-05-25"); // Monday
    expect(r.slots[6].date).toBe("2026-05-31"); // Sunday
    expect(r.slots.every((s) => s.timeSlot === "morning")).toBe(true);
  });

  it("treats 'tonight' / 'stasera' as today evening", () => {
    expect(parse("free tonight").slots).toEqual([
      { date: "2026-05-21", timeSlot: "evening", status: "available" },
    ]);
    expect(parse("stasera sono libero").slots).toEqual([
      { date: "2026-05-21", timeSlot: "evening", status: "available" },
    ]);
  });

  it("drops out-of-window dates with a warning", () => {
    const r = parse("free on july 4th");
    expect(r.matched).toBe(false);
    expect(r.slots).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes("2026-07-04"))).toBe(true);
  });

  it("returns matched: false for unparseable input", () => {
    const r = parse("hello there friend");
    expect(r.matched).toBe(false);
    expect(r.slots).toHaveLength(0);
  });

  it("repeats 'every <weekday>' across the whole window", () => {
    const r = parse("free every saturday evening");
    // Saturdays in the 35-day window from Thu 2026-05-21.
    expect(r.slots.map((s) => s.date)).toEqual([
      "2026-05-23",
      "2026-05-30",
      "2026-06-06",
      "2026-06-13",
      "2026-06-20",
    ]);
    expect(r.slots.every((s) => s.timeSlot === "evening")).toBe(true);
    expect(r.slots.every((s) => s.status === "available")).toBe(true);
  });

  it("repeats Italian 'ogni <weekday>' the same way", () => {
    const r = parse("ogni sabato sera sono libero");
    expect(r.slots.map((s) => s.date)).toEqual([
      "2026-05-23",
      "2026-05-30",
      "2026-06-06",
      "2026-06-13",
      "2026-06-20",
    ]);
    expect(r.slots.every((s) => s.timeSlot === "evening")).toBe(true);
  });

  it("marks unavailable from Italian 'occupato'", () => {
    const r = parse("domani pomeriggio sono occupato");
    expect(r.slots).toEqual([
      { date: "2026-05-22", timeSlot: "afternoon", status: "unavailable" },
    ]);
  });

  it("'busy for the remaining' fills only unmarked cells", () => {
    const marked = new Set<string>([
      "2026-05-21__morning",
      "2026-05-21__afternoon",
      "2026-05-21__evening",
      "2026-05-22__morning",
    ]);
    const r = parseAvailabilitySpeech("busy for the remaining", {
      today: TODAY,
      windowDates: WINDOW,
      markedCells: marked,
    });
    expect(r.matched).toBe(true);
    // 35 days × 3 slots = 105 cells; 4 already marked → 101 left.
    expect(r.slots).toHaveLength(105 - marked.size);
    expect(r.slots.every((s) => s.status === "unavailable")).toBe(true);
    expect(
      r.slots.some(
        (s) => s.date === "2026-05-21" && s.timeSlot === "morning",
      ),
    ).toBe(false);
    expect(
      r.slots.some(
        (s) => s.date === "2026-05-22" && s.timeSlot === "afternoon",
      ),
    ).toBe(true);
  });

  it("Italian 'disponibile per il resto' works too", () => {
    const marked = new Set<string>(["2026-05-23__evening"]);
    const r = parseAvailabilitySpeech("disponibile per il resto", {
      today: TODAY,
      windowDates: WINDOW,
      markedCells: marked,
    });
    expect(r.slots).toHaveLength(105 - 1);
    expect(r.slots.every((s) => s.status === "available")).toBe(true);
  });

  it("'remaining mornings' respects time filter", () => {
    const marked = new Set<string>(["2026-05-21__morning"]);
    const r = parseAvailabilitySpeech("available for the remaining mornings", {
      today: TODAY,
      windowDates: WINDOW,
      markedCells: marked,
    });
    expect(r.slots.every((s) => s.timeSlot === "morning")).toBe(true);
    expect(r.slots).toHaveLength(35 - 1);
  });
});
