import { Check, HelpCircle, X, Circle } from "lucide-react";
import { AvailabilityStatus } from "@/lib/core/types";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<
  AvailabilityStatus,
  { label: string; color: string; Icon: typeof Check }
> = {
  available: { label: "Available", color: "hsl(var(--avail))", Icon: Check },
  maybe: { label: "Maybe", color: "hsl(var(--maybe))", Icon: HelpCircle },
  unavailable: { label: "Unavailable", color: "hsl(var(--unavail))", Icon: X },
};

/** Small status pill used in legends and member rows (icon + label, not color alone). */
export function StatusChip({
  status,
  className,
}: {
  status: AvailabilityStatus;
  className?: string;
}) {
  const { label, color, Icon } = STATUS_META[status];
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
  const { color, Icon } = STATUS_META[status];
  return (
    <Icon
      className={cn("h-4 w-4", className)}
      style={{ color }}
      strokeWidth={2.75}
      aria-hidden
    />
  );
}
