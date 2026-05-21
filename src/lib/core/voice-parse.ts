// Pure, dependency-free parser that turns a spoken/typed sentence into
// availability cells. Bilingual (English + Italian). No framework, no I/O — so it
// can be unit-tested like scoring.ts and reused anywhere.
//
// Example: parseAvailabilitySpeech("free next saturday evening but busy sunday", {
//   today: "2026-05-21", windowDates: rollingDates(),
// })

import { AvailabilityStatus, TimeSlot, TIME_SLOTS } from "./types";

export interface ParsedSlot {
  date: string; // yyyy-mm-dd
  timeSlot: TimeSlot;
  status: AvailabilityStatus;
}

export interface ParseResult {
  slots: ParsedSlot[];
  matched: boolean;
  warnings: string[];
}

export type ParseLang = "en" | "it";

interface ParseOpts {
  today: string; // ISO reference date
  windowDates: string[]; // valid rolling-window dates; results are clamped to these
  lang?: ParseLang; // reserved; the matcher understands both languages regardless
}

// ---------------------------------------------------------------------------
// Local date helpers (kept here so core/ stays dependency-free).
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseISO(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

function dow(iso: string): number {
  return parseISO(iso).getDay(); // 0=Sun .. 6=Sat
}

// Whole-word / whole-phrase match (boundaries are non-alphanumeric or string ends).
function hasWord(text: string, word: string): boolean {
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${w}([^a-z0-9]|$)`).test(text);
}

// ---------------------------------------------------------------------------
// Vocabularies (matched against accent-stripped, apostrophe-free lowercase text).
// ---------------------------------------------------------------------------

const SLOT_ORDER: Record<TimeSlot, number> = {
  morning: 0,
  afternoon: 1,
  evening: 2,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, domenica: 0,
  monday: 1, mon: 1, lunedi: 1,
  tuesday: 2, tue: 2, tues: 2, martedi: 2,
  wednesday: 3, wed: 3, mercoledi: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4, giovedi: 4,
  friday: 5, fri: 5, venerdi: 5,
  saturday: 6, sat: 6, sabato: 6,
};

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, gennaio: 0,
  february: 1, feb: 1, febbraio: 1,
  march: 2, marzo: 2,
  april: 3, apr: 3, aprile: 3,
  may: 4, maggio: 4,
  june: 5, jun: 5, giugno: 5,
  july: 6, jul: 6, luglio: 6,
  august: 7, aug: 7, agosto: 7,
  september: 8, sep: 8, sept: 8, settembre: 8,
  october: 9, oct: 9, ottobre: 9,
  november: 10, nov: 10, novembre: 10,
  december: 11, dec: 11, dicembre: 11,
};

const UNAVAILABLE_HINTS = [
  "busy", "cant", "cannot", "can not", "unavailable", "not free",
  "not available", "no", "out", "away", "wont", "skip",
  "occupato", "occupata", "impegnato", "impegnata", "non posso",
  "non ci sono", "non disponibile", "non libero", "indisponibile",
];

const MAYBE_HINTS = [
  "maybe", "perhaps", "possibly", "might", "not sure",
  "forse", "magari", "probabilmente", "puo darsi", "non so",
];

const AVAILABLE_HINTS = [
  "free", "available", "im in", "count me in", "yes", "open",
  "libero", "libera", "disponibile", "posso", "ci sono", "si", "ok", "okay",
];

const MORNING_HINTS = ["morning", "mattina", "mattino"];
const AFTERNOON_HINTS = ["afternoon", "pomeriggio"];
const EVENING_HINTS = ["evening", "night", "tonight", "sera", "serata", "notte", "stasera", "stanotte"];
const ALLDAY_HINTS = ["all day", "whole day", "entire day", "tutto il giorno", "giornata"];

// Spoken markers that also pin the date to "today".
const TODAY_TONIGHT = ["today", "oggi", "tonight", "stasera", "stanotte"];

// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics: si/pero/venerdi
    .replace(/[‘’']/g, "") // smart + plain apostrophes: cant, im
    .replace(/\s+/g, " ")
    .trim();
}

function detectStatus(clause: string): AvailabilityStatus | null {
  for (const w of UNAVAILABLE_HINTS) if (hasWord(clause, w)) return "unavailable";
  for (const w of MAYBE_HINTS) if (hasWord(clause, w)) return "maybe";
  for (const w of AVAILABLE_HINTS) if (hasWord(clause, w)) return "available";
  return null;
}

function detectSlots(clause: string): TimeSlot[] {
  if (ALLDAY_HINTS.some((w) => hasWord(clause, w))) return [...TIME_SLOTS];
  const out: TimeSlot[] = [];
  if (MORNING_HINTS.some((w) => hasWord(clause, w))) out.push("morning");
  if (AFTERNOON_HINTS.some((w) => hasWord(clause, w))) out.push("afternoon");
  if (EVENING_HINTS.some((w) => hasWord(clause, w))) out.push("evening");
  return out;
}

// Resolve a calendar month+day to the next matching ISO date on/after `today`.
function resolveMonthDay(month: number, day: number, today: string): string {
  const ty = parseISO(today).getFullYear();
  for (const y of [ty, ty + 1]) {
    const iso = `${y}-${pad(month + 1)}-${pad(day)}`;
    if (iso >= today) return iso;
  }
  return `${ty}-${pad(month + 1)}-${pad(day)}`;
}

// Resolve a bare day-of-month to the next date on/after `today` matching it.
function resolveDayOfMonth(day: number, today: string): string | null {
  for (let i = 0; i < 60; i++) {
    const iso = addDays(today, i);
    if (parseISO(iso).getDate() === day) return iso;
  }
  return null;
}

function resolveDates(clause: string, today: string): string[] {
  const dates = new Set<string>();
  const td = dow(today);

  // Relative days (check "day after tomorrow" before "tomorrow").
  if (hasWord(clause, "day after tomorrow") || hasWord(clause, "dopodomani")) {
    dates.add(addDays(today, 2));
  }
  if (hasWord(clause, "tomorrow") || hasWord(clause, "domani")) {
    dates.add(addDays(today, 1));
  }
  if (TODAY_TONIGHT.some((w) => hasWord(clause, w))) {
    dates.add(today);
  }

  // "every"/"each" (EN) · "ogni"/"tutti i"/"tutte le" (IT) → repeat the weekday
  // (or weekend) across the whole horizon; out-of-window dates are clamped later.
  const isEvery =
    hasWord(clause, "every") ||
    hasWord(clause, "each") ||
    hasWord(clause, "ogni") ||
    hasWord(clause, "tutti i") ||
    hasWord(clause, "tutte le") ||
    hasWord(clause, "tutti") ||
    hasWord(clause, "tutte");

  // Horizon a bit beyond the 5-week window so clamping keeps every visible match.
  const HORIZON = 49;

  // Weekend → upcoming Saturday + Sunday (all of them when recurring).
  if (hasWord(clause, "weekend") || hasWord(clause, "fine settimana")) {
    const firstSat = (6 - td + 7) % 7;
    if (isEvery) {
      for (let k = firstSat; k < HORIZON; k += 7) {
        dates.add(addDays(today, k));
        dates.add(addDays(today, k + 1));
      }
    } else {
      dates.add(addDays(today, firstSat));
      dates.add(addDays(today, firstSat + 1));
    }
  }

  // Next week → Mon–Sun of the following calendar week.
  if (
    hasWord(clause, "next week") ||
    hasWord(clause, "settimana prossima") ||
    hasWord(clause, "prossima settimana")
  ) {
    const toMon = (1 - td + 7) % 7;
    const start = addDays(today, toMon === 0 ? 7 : toMon);
    for (let i = 0; i < 7; i++) dates.add(addDays(start, i));
  }

  // This week → today through the upcoming Sunday.
  if (
    (hasWord(clause, "this week") || hasWord(clause, "questa settimana")) &&
    !hasWord(clause, "next week")
  ) {
    const toSun = (0 - td + 7) % 7;
    for (let i = 0; i <= toSun; i++) dates.add(addDays(today, i));
  }

  // Weekday names. "next"/"prossimo" pushes to the following week's instance.
  const isNext =
    hasWord(clause, "next") ||
    hasWord(clause, "prossimo") ||
    hasWord(clause, "prossima");
  for (const [name, wd] of Object.entries(WEEKDAYS)) {
    if (!hasWord(clause, name)) continue;
    const base = (wd - td + 7) % 7;
    if (isEvery) {
      for (let k = base; k < HORIZON; k += 7) dates.add(addDays(today, k));
    } else {
      dates.add(addDays(today, isNext ? base + 7 : base));
    }
  }

  // month + day  ("may 24", "may 24th") and day + month ("24 may", "24 maggio").
  const monthAlt = Object.keys(MONTHS).join("|");
  const mdSrc = `\\b(${monthAlt})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`;
  const dmSrc = `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthAlt})\\b`;
  for (const mm of clause.matchAll(new RegExp(mdSrc, "g"))) {
    dates.add(resolveMonthDay(MONTHS[mm[1]], Number(mm[2]), today));
  }
  for (const mm of clause.matchAll(new RegExp(dmSrc, "g"))) {
    dates.add(resolveMonthDay(MONTHS[mm[2]], Number(mm[1]), today));
  }

  // Strip any month+day spans so the bare day-of-month detectors below don't
  // re-interpret the same number as a different date (e.g. "july 4th").
  const residual = clause
    .replace(new RegExp(mdSrc, "g"), " ")
    .replace(new RegExp(dmSrc, "g"), " ");

  // Ordinal day-of-month ("the 24th", "3rd").
  for (const mm of residual.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\b/g)) {
    const iso = resolveDayOfMonth(Number(mm[1]), today);
    if (iso) dates.add(iso);
  }
  // "the 24" / "il 24" / "on 24" (require a determiner to avoid stray numbers).
  for (const mm of residual.matchAll(/\b(?:the|il|on the|on)\s+(\d{1,2})\b/g)) {
    const iso = resolveDayOfMonth(Number(mm[1]), today);
    if (iso) dates.add(iso);
  }

  return [...dates];
}

export function parseAvailabilitySpeech(
  transcript: string,
  opts: ParseOpts,
): ParseResult {
  const warnings: string[] = [];
  const norm = normalize(transcript);
  if (!norm) return { slots: [], matched: false, warnings };

  const windowSet = new Set(opts.windowDates);
  // Last write wins on conflicts (a later clause overrides an earlier one).
  const byCell = new Map<string, ParsedSlot>();
  const dropped = new Set<string>();

  const clauses = norm
    .split(/\b(?:and|but|however|e|ma|pero|inoltre)\b|[,;]/)
    .map((c) => c.trim())
    .filter(Boolean);

  let prevStatus: AvailabilityStatus = "available";

  for (const clause of clauses) {
    const detected = detectStatus(clause);
    const status = detected ?? prevStatus;
    if (detected) prevStatus = detected;

    const dates = resolveDates(clause, opts.today);
    if (dates.length === 0) continue;

    const slots = detectSlots(clause);
    const effectiveSlots = slots.length ? slots : [...TIME_SLOTS];

    for (const date of dates) {
      if (!windowSet.has(date)) {
        dropped.add(date);
        continue;
      }
      for (const timeSlot of effectiveSlots) {
        byCell.set(`${date}__${timeSlot}`, { date, timeSlot, status });
      }
    }
  }

  for (const iso of dropped) {
    warnings.push(`${iso} is outside the planning window — skipped.`);
  }

  const slots = [...byCell.values()].sort((a, b) =>
    a.date === b.date
      ? SLOT_ORDER[a.timeSlot] - SLOT_ORDER[b.timeSlot]
      : a.date < b.date
        ? -1
        : 1,
  );

  return { slots, matched: slots.length > 0, warnings };
}
