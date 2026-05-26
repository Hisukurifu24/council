"use client";

import { Check, HelpCircle, X, Circle } from "lucide-react";
import { AvailabilityStatus } from "@/lib/core/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const STATUS_STYLE: Record<
  AvailabilityStatus,
  { color: string; Icon: typeof Check }
> = {
  available: { color: "hsl(var(--avail))", Icon: Check },
  maybe: { color: "hsl(var(--maybe))", Icon: HelpCircle },
  unavailable: { color: "hsl(var(--unavail))", Icon: X },
};

export function useStatusMeta() {
  const { t } = useI18n();
  return (status: AvailabilityStatus) => ({
    label: t(`status.${status}`),
    color: STATUS_STYLE[status].color,
    Icon: STATUS_STYLE[status].Icon,
  });
}

/** Small status pill used in legends and member rows (icon + label, not color alone). */
export function StatusChip({
  status,
  className,
}: {
  status: AvailabilityStatus;
  className?: string;
}) {
  const meta = useStatusMeta()(status);
  const { color, Icon, label } = meta;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm", className)}
      style={{ color }}
    >
      <Icon className="h-4 w-4" strokeWidth={2.5} />
      {label}
    </span>
  );
}

export function StatusGlyph({
  status,
  className,
}: {
  status?: AvailabilityStatus;
  className?: string;
}) {
  if (!status)
    return (
      <Circle
        className={cn("h-4 w-4 text-muted-foreground/40", className)}
        strokeWidth={2}
      />
    );
  const { color, Icon } = STATUS_STYLE[status];
  return (
    <Icon
      className={cn("h-4 w-4", className)}
      style={{ color }}
      strokeWidth={2.75}
      aria-hidden
    />
  );
}
