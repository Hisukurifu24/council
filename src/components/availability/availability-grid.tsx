"use client";

import * as React from "react";
import { Check, Crown, Star } from "lucide-react";
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
  isPast?: (date: string, slot: TimeSlot) => boolean;
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

const LONG_PRESS_MS = 280; // hold this long on touch to start drag-painting
const MOVE_CANCEL_PX = 10; // finger moves more than this before the hold → it's a scroll

export function AvailabilityGrid({
  round,
  model,
  myStatus,
  onSet,
  canEdit,
  isPast,
}: Props) {
  const gridRef = React.useRef<HTMLDivElement>(null);

  // The status currently being painted (non-null while a drag is active, for
  // both mouse and touch). Touch additionally uses a long-press to *start*.
  const painting = React.useRef<AvailabilityStatus | null>(null);
  const touchStart = React.useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = React.useRef<number | null>(null);

  const apply = React.useCallback(
    (date: string, slot: TimeSlot, status: AvailabilityStatus) => {
      if (!canEdit || (isPast?.(date, slot) ?? false)) return;
      onSet(date, slot, status);
    },
    [canEdit, isPast, onSet],
  );

  const startPaint = (date: string, slot: TimeSlot) => {
    if (isPast?.(date, slot)) return;
    const next = cycleStatus(myStatus(date, slot));
    painting.current = next;
    apply(date, slot, next);
  };

  const paintAt = (date: string, slot: TimeSlot) => {
    if (painting.current != null) apply(date, slot, painting.current);
  };

  const handleTap = (date: string, slot: TimeSlot) => {
    apply(date, slot, cycleStatus(myStatus(date, slot)));
  };

  React.useEffect(() => {
    const clearTimer = () => {
      if (longPressTimer.current != null) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    };
    const stop = () => {
      painting.current = null;
      touchStart.current = null;
      clearTimer();
    };

    const cellFromPoint = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      const btn = el?.closest("[data-date]") as HTMLElement | null;
      const date = btn?.getAttribute("data-date");
      const slot = btn?.getAttribute("data-slot") as TimeSlot | null;
      return date && slot ? { date, slot } : null;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return; // mouse drag uses onPointerEnter
      if (painting.current != null) {
        const cell = cellFromPoint(e.clientX, e.clientY);
        if (cell) paintAt(cell.date, cell.slot);
        return;
      }
      // Before the long-press fires: a real finger move means the user is
      // scrolling, so cancel the pending paint and let the page scroll.
      const start = touchStart.current;
      if (start && longPressTimer.current != null) {
        if (
          Math.abs(e.clientX - start.x) > MOVE_CANCEL_PX ||
          Math.abs(e.clientY - start.y) > MOVE_CANCEL_PX
        ) {
          stop();
        }
      }
    };

    // Block scrolling only while actively painting on touch.
    const onTouchMove = (e: TouchEvent) => {
      if (painting.current != null) e.preventDefault();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    const gridEl = gridRef.current;
    gridEl?.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      gridEl?.removeEventListener("touchmove", onTouchMove);
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply, myStatus]);

  return (
    <div className="no-select">
      <div
        ref={gridRef}
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
                const past = isPast?.(date, slot) ?? false;
                const isBest = model.bestId === id;
                const isBackup = model.backupId === id;
                const isViable =
                  model.minPlayers > 0 &&
                  (score?.playersViable ?? 0) >= model.minPlayers;
                const intensity = heatToIntensity(score?.heat ?? 0);

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!canEdit || past}
                    data-date={date}
                    data-slot={slot}
                    aria-label={`${weekday} ${day} ${TIME_SLOT_LABELS[slot]}: ${
                      score?.available ?? 0
                    } available${
                      score?.maybe ? `, ${score.maybe} maybe` : ""
                    }${isViable ? ", viable session" : ""}. Your status: ${
                      mine ?? "not set"
                    }.`}
                    onPointerDown={(e) => {
                      if (!canEdit) return;
                      if (e.pointerType === "mouse") {
                        startPaint(date, slot);
                        return;
                      }
                      // touch / pen: arm a long-press to begin drag-painting
                      touchStart.current = { x: e.clientX, y: e.clientY };
                      if (longPressTimer.current != null)
                        clearTimeout(longPressTimer.current);
                      longPressTimer.current = window.setTimeout(() => {
                        longPressTimer.current = null;
                        touchStart.current = null;
                        startPaint(date, slot);
                      }, LONG_PRESS_MS);
                    }}
                    onPointerEnter={(e) => {
                      if (!canEdit || e.pointerType !== "mouse") return;
                      paintAt(date, slot);
                    }}
                    onPointerUp={(e) => {
                      if (!canEdit || e.pointerType === "mouse") return;
                      // touch: released before the hold fired → it's a tap
                      if (
                        painting.current == null &&
                        longPressTimer.current != null
                      ) {
                        clearTimeout(longPressTimer.current);
                        longPressTimer.current = null;
                        touchStart.current = null;
                        handleTap(date, slot);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!canEdit) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleTap(date, slot);
                      }
                    }}
                    className={cn(
                      "relative flex h-16 flex-col items-center justify-center rounded-xl border transition-all",
                      "border-border/70",
                      past
                        ? "cursor-default opacity-35"
                        : canEdit
                          ? "hover:border-primary/60"
                          : "cursor-default",
                      !past && isViable && !isBest && !isBackup &&
                        "ring-1 ring-[hsl(var(--avail))]",
                      !past && isBest && "ring-2 ring-primary shadow-glow",
                      !past && isBackup && "ring-1 ring-accent/70",
                    )}
                    style={{ background: HEAT_BG[intensity] }}
                  >
                    {!past && isBest && (
                      <Crown className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary p-0.5 text-primary-foreground" />
                    )}
                    {!past && isBackup && !isBest && (
                      <Star className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-accent p-0.5 text-accent-foreground" />
                    )}
                    {!past && isViable && !isBest && !isBackup && (
                      <Check className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[hsl(var(--avail))] p-0.5 text-background" />
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
