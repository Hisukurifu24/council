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
import { STATUS_STYLE } from "./status";
import { useI18n } from "@/lib/i18n";

const GROUP_KEYS: { key: AvailabilityStatus | "none"; label: string }[] = [
  { key: "available", label: "status.available" },
  { key: "maybe", label: "status.maybe" },
  { key: "unavailable", label: "status.cantMakeIt" },
  { key: "none", label: "status.noResponse" },
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
  const { t } = useI18n();
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
      {GROUP_KEYS.map(({ key, label }) => {
        const people = grouped[key];
        if (people.length === 0) return null;
        const style = key === "none" ? null : STATUS_STYLE[key as AvailabilityStatus];
        const Icon = style?.Icon ?? Circle;
        return (
          <div key={key}>
            <div
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide"
              style={style ? { color: style.color } : undefined}
            >
              <Icon
                className={cn("h-4 w-4", !style && "text-muted-foreground/50")}
                strokeWidth={2.5}
              />
              {t(label)}
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
                    <Crown className="h-3 w-3 text-accent" aria-label={t("members.dm")} />
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
