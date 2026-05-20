"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { TIME_SLOTS, TIME_SLOT_LABELS, TimeSlot } from "@/lib/core/types";
import { createCampaignSchema } from "@/lib/core/schemas";
import { createCampaign } from "@/lib/store";
import { cn, formatDateLabel, nextNDays } from "@/lib/utils";

export default function CreatePage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [hostName, setHostName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [slots, setSlots] = React.useState<TimeSlot[]>([...TIME_SLOTS]);
  const [dates, setDates] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string>("");

  const candidates = React.useMemo(() => nextNDays(14), []);

  const toggleDate = (d: string) =>
    setDates((cur) =>
      cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort(),
    );

  const toggleSlot = (s: TimeSlot) =>
    setSlots((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
    );

  const pickWeekends = () =>
    setDates(
      candidates.filter((d) => {
        const day = new Date(d + "T00:00:00").getDay();
        return day === 5 || day === 6 || day === 0; // Fri/Sat/Sun
      }),
    );

  const submit = () => {
    const parsed = createCampaignSchema.safeParse({
      name,
      hostName,
      description: description || undefined,
      dates,
      timeSlots: slots,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    const { campaign } = createCampaign(parsed.data);
    router.push(`/plan/?code=${campaign.inviteCode}`);
  };

  return (
    <AppShell title="New campaign" back="/">
      <div className="space-y-6">
        <div>
          <Label htmlFor="name">Campaign name</Label>
          <Input
            id="name"
            placeholder="Storm King's Thunder"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="host">Your name</Label>
          <Input
            id="host"
            placeholder="Dungeon Master"
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="mb-0">Candidate dates</Label>
            <div className="flex gap-3 text-xs">
              <button
                className="text-primary hover:underline"
                onClick={pickWeekends}
                type="button"
              >
                Weekends
              </button>
              <button
                className="text-muted-foreground hover:underline"
                onClick={() => setDates([])}
                type="button"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {candidates.map((d) => {
              const { weekday, day } = formatDateLabel(d);
              const on = dates.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDate(d)}
                  className={cn(
                    "flex flex-col items-center rounded-xl border py-2 text-xs transition-all active:scale-95",
                    on
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-border",
                  )}
                >
                  <span className="font-semibold">{weekday}</span>
                  <span>{day.replace(/^\w+ /, "")}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="mb-0">Time slots</Label>
          <div className="mt-1.5 flex gap-2">
            {TIME_SLOTS.map((s) => {
              const on = slots.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSlot(s)}
                  className={cn(
                    "flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all active:scale-95",
                    on
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {TIME_SLOT_LABELS[s]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="desc">Notes (optional)</Label>
          <Textarea
            id="desc"
            placeholder="Bring snacks. We resume at the Sunless Citadel."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="w-full" size="lg" onClick={submit}>
          <CalendarCheck className="h-5 w-5" />
          Create campaign
        </Button>
      </div>
    </AppShell>
  );
}
