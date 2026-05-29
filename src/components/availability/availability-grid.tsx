"use client";

import * as React from "react";
import { Check, Crown, Star, Users } from "lucide-react";
import {
  AvailabilityStatus,
  SchedulingRound,
  TimeSlot,
  slotKeyId,
} from "@/lib/core/types";
import { cycleStatus } from "@/lib/store";
import { ScoreModel } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { StatusGlyph } from "./status";
import { useI18n, useFormatDate, useTimeSlotLabel, useStatusLabel } from "@/lib/i18n";

interface Props {
  round: SchedulingRound;
  model: ScoreModel;
  myStatus: (date: string, slot: TimeSlot) => AvailabilityStatus | undefined;
  onSet: (date: string, slot: TimeSlot, status: AvailabilityStatus) => void;
  canEdit: boolean;
  isPast?: (date: string, slot: TimeSlot) => boolean;
  onShowVoters?: (date: string, slot: TimeSlot) => void;
  /** When provided (DM only), the corner badge on viable/best/backup cells
   *  becomes a tap target to book a session for that slot. */
  onBook?: (date: string, slot: TimeSlot) => void;
}

// Cell background reflects *your* personal status only, so a glance answers
// "did I mark this?" — the group's availability is shown via the meter bar.
const MINE_BG: Record<AvailabilityStatus, string> = {
  available: "hsl(var(--avail) / 0.22)",
  maybe: "hsl(var(--maybe) / 0.18)",
  unavailable: "hsl(var(--unavail) / 0.14)",
};
const MINE_BORDER: Record<AvailabilityStatus, string> = {
  available: "hsl(var(--avail) / 0.85)",
  maybe: "hsl(var(--maybe) / 0.85)",
  unavailable: "hsl(var(--unavail) / 0.7)",
};

const LONG_PRESS_MS = 280; // hold this long on touch to start drag-painting
const MOVE_CANCEL_PX = 10; // finger moves more than this before the hold → it's a scroll

export function AvailabilityGrid({
  round,
  model,
  myStatus,
  onSet,
  canEdit,
  isPast,
  onShowVoters,
  onBook,
}: Props) {
  const { t } = useI18n();
  const fmt = useFormatDate();
  const slotLabel = useTimeSlotLabel();
  const statusLabel = useStatusLabel();
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
            {slotLabel(slot)}
          </div>
        ))}

        {round.dates.map((date) => {
          const { weekday, day } = fmt(date);
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
                const partyTotal = score?.total ?? 0;
                const availShare = partyTotal > 0
                  ? (score?.available ?? 0) / partyTotal
                  : 0;
                const maybeShare = partyTotal > 0
                  ? (score?.maybe ?? 0) / partyTotal
                  : 0;
                const unavailShare = partyTotal > 0
                  ? (score?.unavailable ?? 0) / partyTotal
                  : 0;

                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!canEdit || past}
                    data-date={date}
                    data-slot={slot}
                    aria-label={t("grid.cellAria", {
                      weekday,
                      day,
                      slot: slotLabel(slot),
                      avail: score?.available ?? 0,
                      maybeFrag: score?.maybe
                        ? t("grid.maybeFrag", { n: score.maybe })
                        : "",
                      viableFrag: isViable ? t("grid.viableFrag") : "",
                      mine: mine ? t(`status.${mine}`) : t("status.notSet"),
                    })}
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
                      "relative flex h-16 flex-col items-center justify-center pt-2 pb-2 rounded-xl border transition-all",
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
                    style={{
                      background: mine && !past ? MINE_BG[mine] : "transparent",
                      borderColor:
                        mine && !past
                          ? MINE_BORDER[mine]
                          : "hsl(var(--border) / 0.7)",
                      borderWidth: mine && !past ? 2 : 1,
                    }}
                  >
                    {/* corner badge marks best (crown) / backup (star) /
                        otherwise-viable (check). When the viewer is the DM,
                        `onBook` makes it a tap target to book that slot;
                        otherwise it is a decorative marker. */}
                    {!past && (isBest || isBackup || isViable) && (() => {
                      const Icon = isBest ? Crown : isBackup ? Star : Check;
                      const badgeCls = isBest
                        ? "bg-primary text-primary-foreground"
                        : isBackup
                          ? "bg-accent text-accent-foreground"
                          : "bg-[hsl(var(--avail))] text-background";
                      if (!onBook)
                        return (
                          <span
                            aria-hidden
                            className={cn(
                              "absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0.5",
                              badgeCls,
                            )}
                          >
                            <Icon className="h-full w-full" />
                          </span>
                        );
                      return (
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={t("grid.bookSlot", {
                            weekday,
                            day,
                            slot: slotLabel(slot),
                          })}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onBook(date, slot);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              onBook(date, slot);
                            }
                          }}
                          className={cn(
                            "absolute -top-2 -right-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full p-0.5 shadow-sm ring-2 ring-background/70 transition-transform hover:scale-110",
                            badgeCls,
                          )}
                        >
                          <Icon className="h-full w-full" />
                        </span>
                      );
                    })()}

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

                    {/* what *you* voted — icon-only pill so it stays compact;
                        full label lives in the aria-label for accessibility */}
                    <span
                      aria-label={
                        mine
                          ? `${t("common.you")}: ${statusLabel(mine)}`
                          : t("status.notSet")
                      }
                      className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-background/70"
                    >
                      <StatusGlyph status={mine} className="h-3 w-3" />
                    </span>

                    {/* group meter — share of party by status: available
                        (green) → maybe (amber) → unavailable (red). The empty
                        tail is "no response yet". Sits along the bottom edge,
                        below the count and your-status icons. */}
                    {!past && partyTotal > 0 && (
                      <span
                        aria-hidden
                        className="pointer-events-none mt-1.5 flex h-1 w-4/5 shrink-0 overflow-hidden rounded-full bg-border/40"
                      >
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.round(availShare * 100)}%`,
                            background: "hsl(var(--avail))",
                          }}
                        />
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.round(maybeShare * 100)}%`,
                            background: "hsl(var(--maybe) / 0.7)",
                          }}
                        />
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.round(unavailShare * 100)}%`,
                            background: "hsl(var(--unavail) / 0.65)",
                          }}
                        />
                      </span>
                    )}

                    {/* "who voted" — top-left affordance to open the per-slot
                        voter breakdown */}
                    {!past && onShowVoters && (
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={t("grid.seeWhoVoted", {
                          weekday,
                          day,
                          slot: slotLabel(slot),
                        })}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onShowVoters(date, slot);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onShowVoters(date, slot);
                          }
                        }}
                        className="absolute left-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                      >
                        <Users className="h-2.5 w-2.5" />
                      </span>
                    )}
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
