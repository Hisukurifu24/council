"use client";

import { Crown, Star, CalendarCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Recommendation } from "@/lib/core/scoring";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n, useFormatDate, useTimeSlotLabel } from "@/lib/i18n";

const META = {
  best: {
    labelKey: "rec.best",
    Icon: Crown,
    ring: "ring-primary",
    text: "text-primary",
    bg: "bg-primary/10",
  },
  backup: {
    labelKey: "rec.backup",
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
  const { t } = useI18n();
  const fmt = useFormatDate();
  const slotLabel = useTimeSlotLabel();
  const m = META[rec.kind];
  const { weekday, day } = fmt(rec.slot.date);
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
          {t(m.labelKey)}
        </div>
        <div className="truncate font-display text-lg leading-tight">
          {weekday} {day} · {slotLabel(rec.slot.timeSlot)}
        </div>
        <div className="text-xs text-muted-foreground">
          {t("rec.available", { n: rec.slot.available })}
          {rec.slot.maybe > 0 && t("rec.maybe", { n: rec.slot.maybe })}
          {t("rec.potential", { a: rec.slot.potential, b: rec.slot.total })}
        </div>
      </div>
      {canConfirm && onConfirm && (
        <Button size="sm" variant={rec.kind === "best" ? "default" : "outline"} onClick={onConfirm}>
          <CalendarCheck className="h-4 w-4" />
          {t("rec.confirm")}
        </Button>
      )}
    </motion.div>
  );
}
