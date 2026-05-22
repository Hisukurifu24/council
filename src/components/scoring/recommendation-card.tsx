"use client";

import { Crown, Star, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Recommendation } from "@/lib/core/scoring";
import { TIME_SLOT_LABELS } from "@/lib/core/types";
import { Button } from "@/components/ui/button";
import { cn, formatDateLabel } from "@/lib/utils";

const META = {
  best: {
    label: "Best session time",
    Icon: Crown,
    ring: "ring-primary",
    text: "text-primary",
    bg: "bg-primary/10",
  },
  backup: {
    label: "Good backup",
    Icon: Star,
    ring: "ring-accent/60",
    text: "text-accent",
    bg: "bg-accent/10",
  },
} as const;

export function RecommendationCard({
  rec,
  canConfirm,
  onConfirm,
}: {
  rec: Recommendation;
  canConfirm?: boolean;
  onConfirm?: () => void;
}) {
  const m = META[rec.kind];
  const { weekday, day } = formatDateLabel(rec.slot.date);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-2xl p-3.5 ring-1",
        m.ring,
        m.bg,
      )}
    >
      <div className={cn("rounded-xl bg-background/60 p-2", m.text)}>
        <m.Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-xs font-semibold uppercase tracking-wide", m.text)}>
          {m.label}
        </div>
        <div className="truncate font-display text-lg leading-tight">
          {weekday} {day} · {TIME_SLOT_LABELS[rec.slot.timeSlot]}
        </div>
        <div className="text-xs text-muted-foreground">
          {rec.slot.available} available
          {rec.slot.maybe > 0 && ` (+${rec.slot.maybe} maybe)`} · potential{" "}
          {rec.slot.potential}/{rec.slot.total}
        </div>
      </div>
      {canConfirm && onConfirm && (
        <Button size="sm" variant={rec.kind === "best" ? "default" : "outline"} onClick={onConfirm}>
          <CalendarCheck className="h-4 w-4" />
          Confirm
        </Button>
      )}
    </motion.div>
  );
}
