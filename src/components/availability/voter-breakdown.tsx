"use client";

import { Circle, Crown } from "lucide-react";
import {
  AvailabilityEntry,
  AvailabilityStatus,
  CampaignMember,
  TimeSlot,
} from "@/lib/core/types";
import { MemberAvatar } from "@/components/campaign/member-list";
import { cn } from "@/lib/utils";
import { STATUS_META } from "./status";

const GROUPS: { key: AvailabilityStatus | "none"; label: string }[] = [
  { key: "available", label: "Available" },
  { key: "maybe", label: "Maybe" },
  { key: "unavailable", label: "Can't make it" },
  { key: "none", label: "No response" },
];

/**
 * Shows who voted what for a single date × time-slot: members grouped by their
 * status (available / maybe / unavailable / no response). Members with no entry
 * for the cell fall into "No response".
 */
export function VoterBreakdown({
  members,
  entries,
  date,
  timeSlot,
  hostId,
}: {
  members: CampaignMember[];
  entries: AvailabilityEntry[];
  date: string;
  timeSlot: TimeSlot;
  hostId?: string;
}) {
  const statusByMember = new Map<string, AvailabilityStatus>();
  for (const e of entries) {
    if (e.date === date && e.timeSlot === timeSlot) {
      statusByMember.set(e.memberId, e.status);
    }
  }

  const grouped: Record<string, CampaignMember[]> = {
    available: [],
    maybe: [],
    unavailable: [],
    none: [],
  };
  for (const m of members) {
    grouped[statusByMember.get(m.id) ?? "none"].push(m);
  }

  return (
    <div className="space-y-3">
      {GROUPS.map(({ key, label }) => {
        const people = grouped[key];
        if (people.length === 0) return null;
        const meta = key === "none" ? null : STATUS_META[key as AvailabilityStatus];
        const Icon = meta?.Icon ?? Circle;
        return (
          <div key={key}>
            <div
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
              style={meta ? { color: meta.color } : undefined}
            >
              <Icon
                className={cn("h-4 w-4", !meta && "text-muted-foreground/50")}
                strokeWidth={2.5}
              />
              {label}
              <span className="text-muted-foreground">· {people.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {people.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded-full border border-border/60 bg-card/50 py-1 pl-1 pr-3"
                >
                  <MemberAvatar member={m} className="h-6 w-6 text-[10px]" />
                  <span className="text-sm">{m.guestName}</span>
                  {m.id === hostId && (
                    <Crown className="h-3 w-3 text-accent" aria-label="DM" />
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
