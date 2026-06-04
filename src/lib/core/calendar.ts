// Pure calendar-export helpers. Turn a confirmed Session into a downloadable
// .ics event or a Google Calendar "add event" URL. Framework-agnostic and
// dependency-free so it stays unit-testable (mirrors scoring.ts / voice-parse.ts).

import { Session, SLOT_HOURS, TIME_SLOT_LABELS } from "./types";

export interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
}

/**
 * Resolve a Session's abstract slot to concrete local start/end Dates and build
 * a display title + description. Evening's endHour of 24 rolls the end Date to
 * 00:00 of the next day automatically via the Date constructor.
 */
export function buildCalendarEvent(
  session: Session,
  campaignName: string,
): CalendarEvent {
  const { startHour, endHour } = SLOT_HOURS[session.timeSlot];
  const [y, m, d] = session.date.split("-").map(Number);
  const start = new Date(y, m - 1, d, startHour, 0, 0, 0);
  const end = new Date(y, m - 1, d, endHour, 0, 0, 0);

  const slotLabel = TIME_SLOT_LABELS[session.timeSlot];
  const description = session.notes
    ? `${slotLabel} session.\n${session.notes}`
    : `${slotLabel} session.`;

  return {
    uid: `session-${session.id}@council`,
    title: `${campaignName} — D&D session`,
    description,
    start,
    end,
  };
}

/** "YYYYMMDDTHHMMSS" in local (floating) time — no timezone suffix. */
function toLocalStamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
    `T${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  );
}

/** Escape a value for an iCalendar text field (RFC 5545 §3.3.11). */
function icsEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Minimal VCALENDAR/VEVENT using floating local time so the event lands at the
 * user's local clock time regardless of their calendar's timezone.
 */
export function toIcsString(event: CalendarEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Council//D&D session planner//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${toLocalStamp(new Date())}`,
    `DTSTART:${toLocalStamp(event.start)}`,
    `DTEND:${toLocalStamp(event.end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `DESCRIPTION:${icsEscape(event.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/**
 * Google Calendar "add event" URL. `dates` are local (no Z) and `ctz` carries
 * the user's IANA timezone so Google interprets the times as local.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const tz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toLocalStamp(event.start)}/${toLocalStamp(event.end)}`,
    details: event.description,
  });
  if (tz) params.set("ctz", tz);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
