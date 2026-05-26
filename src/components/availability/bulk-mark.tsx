"use client";

import * as React from "react";
import { ChevronDown, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AvailabilityStatus,
  SchedulingRound,
  TimeSlot,
} from "@/lib/core/types";
import { cn } from "@/lib/utils";
import { useI18n, useTimeSlotLabel, useStatusLabel } from "@/lib/i18n";

interface Props {
  round: SchedulingRound;
  disabled?: boolean;
  onApply: (
    cells: { date: string; timeSlot: TimeSlot }[],
    status: AvailabilityStatus,
  ) => void;
}

type DayFilter =
  | "all"
  | "weekdays"
  | "weekends"
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6";

const DAY_KEYS: { value: DayFilter; key: string }[] = [
  { value: "all", key: "bulk.day.all" },
  { value: "weekdays", key: "bulk.day.weekdays" },
  { value: "weekends", key: "bulk.day.weekends" },
  { value: "1", key: "bulk.day.mon" },
  { value: "2", key: "bulk.day.tue" },
  { value: "3", key: "bulk.day.wed" },
  { value: "4", key: "bulk.day.thu" },
  { value: "5", key: "bulk.day.fri" },
  { value: "6", key: "bulk.day.sat" },
  { value: "0", key: "bulk.day.sun" },
];

const STATUS_OPTIONS: AvailabilityStatus[] = [
  "available",
  "maybe",
  "unavailable",
];

function matchesDay(date: string, filter: DayFilter): boolean {
  if (filter === "all") return true;
  const dow = new Date(date + "T00:00:00").getDay();
  if (filter === "weekdays") return dow >= 1 && dow <= 5;
  if (filter === "weekends") return dow === 0 || dow === 6;
  return dow === Number(filter);
}

const selectClass =
  "h-11 w-full appearance-none rounded-xl border border-input bg-background/60 pl-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function Select({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className="relative">
      <select aria-label={label} className={cn(selectClass, className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function BulkMark({ round, disabled, onApply }: Props) {
  const { t } = useI18n();
  const slotLabel = useTimeSlotLabel();
  const statusLabel = useStatusLabel();
  const [day, setDay] = React.useState<DayFilter>("all");
  const [time, setTime] = React.useState<TimeSlot | "all">("all");
  const [status, setStatus] = React.useState<AvailabilityStatus>("available");

  const apply = () => {
    const cells: { date: string; timeSlot: TimeSlot }[] = [];
    for (const date of round.dates) {
      if (!matchesDay(date, day)) continue;
      for (const slot of round.timeSlots) {
        if (time !== "all" && slot !== time) continue;
        cells.push({ date, timeSlot: slot });
      }
    }
    onApply(cells, status);
  };

  return (
    <section className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wand2 className="h-4 w-4 text-accent" />
        {t("bulk.title")}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select
          label={t("bulk.days")}
          value={day}
          onChange={(e) => setDay(e.target.value as DayFilter)}
          disabled={disabled}
        >
          {DAY_KEYS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.key)}
            </option>
          ))}
        </Select>
        <Select
          label={t("bulk.times")}
          value={time}
          onChange={(e) => setTime(e.target.value as TimeSlot | "all")}
          disabled={disabled}
        >
          <option value="all">{t("bulk.allTimes")}</option>
          {round.timeSlots.map((slot) => (
            <option key={slot} value={slot}>
              {slotLabel(slot)}
            </option>
          ))}
        </Select>
        <Select
          label={t("bulk.availability")}
          value={status}
          onChange={(e) => setStatus(e.target.value as AvailabilityStatus)}
          disabled={disabled}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        <Button onClick={apply} disabled={disabled}>
          <Wand2 className="h-4 w-4" />
          {t("common.apply")}
        </Button>
      </div>
    </section>
  );
}
