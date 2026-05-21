"use client";

import * as React from "react";
import { ChevronDown, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AvailabilityStatus,
  SchedulingRound,
  TIME_SLOT_LABELS,
  TimeSlot,
} from "@/lib/core/types";
import { cn } from "@/lib/utils";
import { STATUS_META } from "./status";

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

const DAY_OPTIONS: { value: DayFilter; label: string }[] = [
  { value: "all", label: "Every day" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "1", label: "Mondays" },
  { value: "2", label: "Tuesdays" },
  { value: "3", label: "Wednesdays" },
  { value: "4", label: "Thursdays" },
  { value: "5", label: "Fridays" },
  { value: "6", label: "Saturdays" },
  { value: "0", label: "Sundays" },
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
        Mark all
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Select
          label="Which days"
          value={day}
          onChange={(e) => setDay(e.target.value as DayFilter)}
          disabled={disabled}
        >
          {DAY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          label="Which times"
          value={time}
          onChange={(e) => setTime(e.target.value as TimeSlot | "all")}
          disabled={disabled}
        >
          <option value="all">All times</option>
          {round.timeSlots.map((slot) => (
            <option key={slot} value={slot}>
              {TIME_SLOT_LABELS[slot]}
            </option>
          ))}
        </Select>
        <Select
          label="Availability"
          value={status}
          onChange={(e) => setStatus(e.target.value as AvailabilityStatus)}
          disabled={disabled}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <Button onClick={apply} disabled={disabled}>
          <Wand2 className="h-4 w-4" />
          Apply
        </Button>
      </div>
    </section>
  );
}
