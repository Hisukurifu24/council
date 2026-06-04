import { describe, expect, it } from "vitest";
import {
  buildCalendarEvent,
  googleCalendarUrl,
  toIcsString,
} from "./calendar";
import { Session, TimeSlot } from "./types";

function session(timeSlot: TimeSlot, notes?: string): Session {
  return {
    id: "s1",
    campaignId: "c1",
    roundId: "r1",
    date: "2026-06-12",
    timeSlot,
    status: "confirmed",
    notes,
    locked: true,
    confirmedBy: "m1",
    confirmedAt: "2026-06-04T00:00:00Z",
    createdAt: "2026-06-04T00:00:00Z",
  };
}

describe("buildCalendarEvent", () => {
  it("maps each slot to its local clock hours", () => {
    const morning = buildCalendarEvent(session("morning"), "Camp");
    expect(morning.start.getHours()).toBe(9);
    expect(morning.end.getHours()).toBe(12);

    const afternoon = buildCalendarEvent(session("afternoon"), "Camp");
    expect(afternoon.start.getHours()).toBe(14);
    expect(afternoon.end.getHours()).toBe(18);
  });

  it("rolls evening's end (24:00) to next-day 00:00", () => {
    const ev = buildCalendarEvent(session("evening"), "Camp");
    expect(ev.start.getHours()).toBe(21);
    expect(ev.start.getDate()).toBe(12);
    expect(ev.end.getHours()).toBe(0);
    expect(ev.end.getDate()).toBe(13); // next day
  });

  it("includes campaign name in the title and notes in the description", () => {
    const ev = buildCalendarEvent(session("evening", "Bring snacks"), "Storm King");
    expect(ev.title).toContain("Storm King");
    expect(ev.description).toContain("Bring snacks");
  });
});

describe("toIcsString", () => {
  it("produces a well-formed VEVENT with correct local timestamps", () => {
    const ics = toIcsString(buildCalendarEvent(session("evening"), "Camp"));
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:session-s1@council");
    expect(ics).toContain("DTSTART:20260612T210000");
    expect(ics).toContain("DTEND:20260613T000000");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("escapes commas and newlines in the description (RFC 5545)", () => {
    const ics = toIcsString(
      buildCalendarEvent(session("morning", "Line one, part two\nLine three"), "Camp"),
    );
    expect(ics).toContain("Line one\\, part two\\nLine three");
  });
});

describe("googleCalendarUrl", () => {
  it("builds a TEMPLATE url with a local start/end date range and encoded title", () => {
    const url = googleCalendarUrl(buildCalendarEvent(session("morning"), "Storm King"));
    expect(url).toContain("https://calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("dates=20260612T090000%2F20260612T120000");
    expect(url).toContain("Storm+King");
  });
});
