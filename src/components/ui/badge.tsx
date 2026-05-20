import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        primary: "bg-primary/15 text-primary",
        accent: "bg-accent/15 text-accent",
        avail: "bg-[hsl(var(--avail)/0.15)] text-[hsl(var(--avail))]",
        maybe: "bg-[hsl(var(--maybe)/0.15)] text-[hsl(var(--maybe))]",
        unavail: "bg-[hsl(var(--unavail)/0.15)] text-[hsl(var(--unavail))]",
        outline: "border border-border text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
