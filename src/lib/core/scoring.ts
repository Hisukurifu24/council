import {
  AvailabilityEntry,
  AvailabilityStatus,
  CampaignMember,
  DEFAULT_WEIGHTS,
  ScoringWeights,
  SchedulingRound,
  TimeSlot,
  slotKeyId,
} from "./types";

export interface SlotScore {
  date: string;
  timeSlot: TimeSlot;
  available: number;
  maybe: number;
  unavailable: number;
  noResponse: number;
  total: number;
  potential: number; // available + maybe
  playersAvailable: number; // available players excluding the DM
  playersViable: number;    // (available + maybe) players excluding the DM — gates session viability
  score: number;
  heat: number; // 0..1, share of members available or maybe — drives heatmap intensity
  dmOk: boolean; // true if the DM is available/maybe for this slot (or there is no DM)
}

export type RecommendationKind = "best" | "backup";

export interface Recommendation {
  kind: RecommendationKind;
  slot: SlotScore;
}

interface ScoreInput {
  round: Pick<SchedulingRound, "dates" | "timeSlots">;
  members: CampaignMember[];
  entries: AvailabilityEntry[];
  hostMemberId?: string;
  weights?: ScoringWeights;
}

/**
 * Score every (date × timeSlot) cell in a round.
 * Pure function — no IO — so it is trivially testable and reusable server-side.
 */
export function scoreRound({
  round,
  members,
  entries,
  hostMemberId,
  weights = DEFAULT_WEIGHTS,
}: ScoreInput): SlotScore[] {
  const total = members.length;

  // index entries by "date__slot" -> memberId -> status
  const byCell = new Map<string, Map<string, AvailabilityStatus>>();
  for (const e of entries) {
    const key = slotKeyId(e.date, e.timeSlot);
    let m = byCell.get(key);
    if (!m) {
      m = new Map();
      byCell.set(key, m);
    }
    m.set(e.memberId, e.status);
  }

  const scores: SlotScore[] = [];
  for (const date of round.dates) {
    for (const timeSlot of round.timeSlots) {
      const cell = byCell.get(slotKeyId(date, timeSlot));
      let available = 0;
      let maybe = 0;
      let unavailable = 0;
      let hostAvailable = false;
      let hostMaybe = false;

      if (cell) {
        for (const [memberId, status] of cell) {
          if (status === "available") {
            available++;
            if (memberId === hostMemberId) hostAvailable = true;
          } else if (status === "maybe") {
            maybe++;
            if (memberId === hostMemberId) hostMaybe = true;
          } else if (status === "unavailable") {
            unavailable++;
          }
        }
      }

      const responded = available + maybe + unavailable;
      const noResponse = Math.max(0, total - responded);
      const hostBonus = hostAvailable ? weights.hostBonus : 0;
      const score =
        available * weights.available +
        maybe * weights.maybe +
        unavailable * weights.unavailable +
        hostBonus;

      scores.push({
        date,
        timeSlot,
        available,
        maybe,
        unavailable,
        noResponse,
        total,
        potential: available + maybe,
        playersAvailable: available - (hostAvailable ? 1 : 0),
        playersViable: available + maybe - ((hostAvailable || hostMaybe) ? 1 : 0),
        score,
        heat: total > 0 ? (available + maybe) / total : 0,
        dmOk: !hostMemberId || hostAvailable || hostMaybe,
      });
    }
  }

  return scores;
}

/**
 * Rank scored slots: highest score first, then fewest unavailable,
 * then highest potential, then earliest date for stability.
 */
export function rankSlots(scores: SlotScore[]): SlotScore[] {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.unavailable !== b.unavailable) return a.unavailable - b.unavailable;
    if (b.potential !== a.potential) return b.potential - a.potential;
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return 0;
  });
}

/**
 * Whether a slot has enough available players (excluding the DM) to be a
 * viable session, per the campaign's minPlayers setting.
 */
export function isViable(slot: SlotScore, minPlayers: number): boolean {
  return slot.playersViable >= minPlayers;
}

/**
 * Produce Best / Backup recommendations.
 * - best: top-ranked slot meeting the minPlayers threshold (excluding the DM).
 * - backup: next-ranked viable slot on a *different date* where possible.
 *
 * Slots where the DM is not available/maybe (`!dmOk`) are excluded entirely:
 * if the DM can't make it, the session can't happen.
 */
export function recommend(
  scores: SlotScore[],
  minPlayers = 1,
): Recommendation[] {
  const ranked = rankSlots(scores).filter((s) => s.total > 0 && s.dmOk);
  const out: Recommendation[] = [];
  if (ranked.length === 0) return out;

  const best = ranked.find((s) => isViable(s, minPlayers));
  if (!best) return out;
  out.push({ kind: "best", slot: best });

  const backup =
    ranked.find(
      (s) => s !== best && s.date !== best.date && isViable(s, minPlayers),
    ) ?? ranked.find((s) => s !== best && isViable(s, minPlayers));
  if (backup) out.push({ kind: "backup", slot: backup });

  return out;
}

/** Map a heat value (0..1) to a tailwind-friendly opacity bucket for the UI. */
export function heatToIntensity(heat: number): number {
  if (heat <= 0) return 0;
  if (heat < 0.25) return 1;
  if (heat < 0.5) return 2;
  if (heat < 0.75) return 3;
  if (heat < 1) return 4;
  return 5;
}
