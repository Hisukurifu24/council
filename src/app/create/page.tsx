"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Minus, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { DEFAULT_MIN_PLAYERS } from "@/lib/core/types";
import { createCampaignSchema } from "@/lib/core/schemas";
import { createCampaign } from "@/lib/store";
import { useCurrentAccount } from "@/lib/hooks";

function CreateInner() {
  const router = useRouter();
  const account = useCurrentAccount();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [minPlayers, setMinPlayers] = React.useState(DEFAULT_MIN_PLAYERS);
  const [error, setError] = React.useState<string>("");

  const submit = () => {
    const parsed = createCampaignSchema.safeParse({
      name,
      hostName: account?.displayName ?? "",
      description: description || undefined,
      minPlayers,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    const { campaign } = createCampaign(parsed.data);
    router.push(`/plan/?code=${campaign.inviteCode}`);
  };

  return (
    <AppShell title="New campaign" back="/dashboard">
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
          <Label>Minimum players for a session</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            How many players (not counting you, the DM) must be available before a
            day counts as a viable session.
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Decrease"
              onClick={() => setMinPlayers((n) => Math.max(0, n - 1))}
            >
              <Minus className="h-5 w-5" />
            </Button>
            <span className="min-w-10 text-center font-display text-2xl tabular-nums">
              {minPlayers}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Increase"
              onClick={() => setMinPlayers((n) => Math.min(50, n + 1))}
            >
              <Plus className="h-5 w-5" />
            </Button>
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

        <p className="text-xs text-muted-foreground">
          Dates are filled in automatically — the next 5 weeks, morning /
          afternoon / evening. Everyone just marks their availability.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="w-full" size="lg" onClick={submit}>
          <CalendarCheck className="h-5 w-5" />
          Create campaign
        </Button>
      </div>
    </AppShell>
  );
}

export default function CreatePage() {
  return (
    <AuthGate>
      <CreateInner />
    </AuthGate>
  );
}
