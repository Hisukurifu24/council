"use client";

import { Crown } from "lucide-react";
import { CampaignMember, SchedulingRound } from "@/lib/core/types";
import { AvailabilityEntry } from "@/lib/core/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function MemberAvatar({
  member,
  className,
}: {
  member: CampaignMember;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black/80",
        className,
      )}
      style={{ background: member.color }}
      title={member.guestName ?? t("members.player")}
    >
      {initials(member.guestName)}
    </span>
  );
}

export function MemberList({
  members,
  round,
  entries,
  hostId,
  myMemberId,
}: {
  members: CampaignMember[];
  round?: SchedulingRound;
  entries: AvailabilityEntry[];
  hostId?: string;
  myMemberId?: string | null;
}) {
  const { t } = useI18n();
  const totalCells = round ? round.dates.length * round.timeSlots.length : 0;
  const windowDates = new Set(round?.dates ?? []);
  const respondedBy = (id: string) =>
    new Set(
      entries
        .filter((e) => e.memberId === id && windowDates.has(e.date))
        .map((e) => `${e.date}${e.timeSlot}`),
    ).size;

  return (
    <ul className="space-y-1.5">
      {members.map((m) => {
        const responded = respondedBy(m.id);
        const done = totalCells > 0 && responded >= totalCells;
        return (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-2"
          >
            <MemberAvatar member={m} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                {m.guestName}
                {m.id === myMemberId && (
                  <span className="text-xs text-muted-foreground">({t("common.you")})</span>
                )}
                {m.id === hostId && (
                  <Crown className="h-3.5 w-3.5 text-accent" aria-label={t("members.dm")} />
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {responded === 0
                  ? t("members.noResponse")
                  : done
                    ? t("members.allSet")
                    : t("members.marked", { n: responded, total: totalCells })}
              </div>
            </div>
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                done
                  ? "bg-[hsl(var(--avail))]"
                  : responded > 0
                    ? "bg-[hsl(var(--maybe))]"
                    : "bg-muted-foreground/30",
              )}
            />
          </li>
        );
      })}
    </ul>
  );
}
