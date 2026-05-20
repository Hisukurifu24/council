"use client";

import * as React from "react";
import { Crown, Star } from "lucide-react";
import {
  AvailabilityStatus,
  SchedulingRound,
  TIME_SLOT_LABELS,
  TimeSlot,
  slotKeyId,
} from "@/lib/core/types";
import { cycleStatus } from "@/lib/store";
import { ScoreModel } from "@/lib/hooks";
import { heatToIntensity } from "@/lib/core/scoring";
import { cn, formatDateLabel } from "@/lib/utils";
import { StatusGlyph } from "./status";

interface Props {
  round: SchedulingRound;
  model: ScoreModel;
  myStatus: (date: string, slot: TimeSlot) => AvailabilityStatus | undefined;
  onSet: (date: string, slot: TimeSlot, status: AvailabilityStatus) => void;
  canEdit: boolean;
}

// background tint intensity by share-available
const HEAT_BG = [
  "transparent",
  "hsl(var(--avail) / 0.12)",
  "hsl(var(--avail) / 0.22)",
  "hsl(var(--avail) / 0.34)",
  "hsl(var(--avail) / 0.48)",
  "hsl(var(--avail) / 0.62)",
];

export function AvailabilityGrid({
  round,
  model,
  myStatus,
  onSet,
  canEdit,
}: Props) {
  // drag-paint state (mouse only — touch uses tap so vertical scroll still works)
  const painting = React.useRef<AvailabilityStatus | null>(null);

  React.useEffect(() => {
    const stop = () => (painting.current = null);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const apply = (date: string, slot: TimeSlot, status: AvailabilityStatus) => {
    if (!canEdit) return;
    onSet(date, slot, status);
  };

  const handleTap = (date: string, slot: TimeSlot) => {
    if (!canEdit) return;
    apply(date, slot, cycleStatus(myStatus(date, slot)));
  };

  return (
    <div className="no-select">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `4.5rem repeat(${round.timeSlots.length}, 1fr)` }}
      >
        {/* header row */}
        <div />
        {round.timeSlots.map((slot) => (
          <div
            key={slot}
            className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {TIME_SLOT_LABELS[slot]}
          </div>
        ))}

        {round.dates.map((date) => {
          const { weekday, day } = formatDateLabel(date);
          return (
            <React.Fragment key={date}>
              <div className="flex flex-col justify-center py-1">
                <span className="text-sm font-semibold leading-none">
                  {weekday}
                </span>
                <span className="text-xs text-muted-foreground">{day}</span>
              </div>
              {round.timeSlots.map((slot) => {
                const id = slotKeyId(date, slot);
                const score = model.byCell.get(id);
                const mine = myStatus(date, slot);
                const isBest = model.bestId === id;
                const isBackup = model.backupId === id;
                const intensity = heatToIntensity(score?.heat ?? 0);

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!canEdit}
                    aria-label={`${weekday} ${day} ${TIME_SLOT_LABELS[slot]}: ${
                      score?.available ?? 0
                    } available${
                      score?.maybe ? `, ${score.maybe} maybe` : ""
                    }. Your status: ${mine ?? "not set"}.`}
                    onClick={() => handleTap(date, slot)}
                    onPointerDown={(e) => {
                      if (e.pointerType !== "mouse" || !canEdit) return;
                      const next = cycleStatus(myStatus(date, slot));
                      painting.current = next;
                      apply(date, slot, next);
                    }}
                    onPointerEnter={(e) => {
                      if (
                        e.pointerType !== "mouse" ||
                        painting.current == null ||
                        !canEdit
                      )
                        return;
                      apply(date, slot, painting.current);
                    }}
                    className={cn(
                      "relative flex h-16 flex-col items-center justify-center rounded-xl border transition-all",
                      "border-border/70",
                      canEdit ? "hover:border-primary/60" : "cursor-default",
                      isBest && "ring-2 ring-primary shadow-glow",
                      isBackup && "ring-1 ring-accent/70",
                    )}
                    style={{ background: HEAT_BG[intensity] }}
                  >
                    {isBest && (
                      <Crown className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                    )}
                    {isBackup && !isBest && (
                      <Star className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-accent p-0.5 text-accent-foreground" />
                    )}

                    <div className="flex items-baseline gap-1 leading-none">
                      <span className="text-lg font-bold tabular-nums">
                        {score?.available ?? 0}
                      </span>
                      {!!score?.maybe && (
                        <span className="text-xs font-medium text-[hsl(var(--maybe))]">
                          +{score.maybe}
                        </span>
                      )}
                    </div>

                    {/* your status marker */}
                    <span
                      className={cn(
                        "mt-1 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        mine ? "bg-background/70" : "text-muted-foreground/50",
                      )}
                    >
                      <StatusGlyph status={mine} className="h-3 w-3" />
                      <span>{mine ? "you" : "—"}</span>
                    </span>
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
