import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function randomId(prefix = ""): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return prefix + crypto.randomUUID();
  }
  let s = "";
  for (let i = 0; i < 16; i++)
    s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return prefix + s;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function inviteCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++)
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return s;
}

// Distinct, readable member colors (used for dots / avatars).
export const MEMBER_COLORS = [
  "#a78bfa", // violet
  "#f59e0b", // amber
  "#34d399", // emerald
  "#60a5fa", // blue
  "#f472b6", // pink
  "#f87171", // red
  "#22d3ee", // cyan
  "#c084fc", // purple
  "#fbbf24", // gold
  "#4ade80", // green
];

export function pickColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length];
}

export function formatDateLabel(iso: string): { weekday: string; day: string } {
  const d = new Date(iso + "T00:00:00");
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    day: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function nextNDays(n: number, start = todayISO()): string[] {
  return Array.from({ length: n }, (_, i) => addDaysISO(start, i));
}
