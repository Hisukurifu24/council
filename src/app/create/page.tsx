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
import { useI18n } from "@/lib/i18n";

function CreateInner() {
  const { t } = useI18n();
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
      setError(parsed.error.issues[0]?.message ?? t("common.formError"));
      return;
    }
    const { campaign } = createCampaign(parsed.data);
    router.push(`/plan/?code=${campaign.inviteCode}`);
  };

  return (
    <AppShell title={t("create.title")} back="/dashboard">
      <div className="space-y-6">
        <div>
          <Label htmlFor="name">{t("create.name")}</Label>
          <Input
            id="name"
            placeholder={t("create.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <Label>{t("create.minPlayers")}</Label>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("create.minPlayersDesc")}
          </p>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("create.decrease")}
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
              aria-label={t("create.increase")}
              onClick={() => setMinPlayers((n) => Math.min(50, n + 1))}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="desc">{t("create.notes")}</Label>
          <Textarea
            id="desc"
            placeholder={t("create.notesPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {t("create.datesHint")}
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="w-full" size="lg" onClick={submit}>
          <CalendarCheck className="h-5 w-5" />
          {t("create.cta")}
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
