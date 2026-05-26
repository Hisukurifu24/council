"use client";

import Link from "next/link";
import { Plus, Users, ChevronRight, Settings } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMyCampaigns, useMounted, useEnsureMyCampaigns } from "@/lib/hooks";
import { getMembers, getSessions } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

function DashboardInner() {
  const { t } = useI18n();
  const mounted = useMounted();
  const campaigns = useMyCampaigns();
  useEnsureMyCampaigns();

  return (
    <AppShell
      title={t("dashboard.title")}
      right={
        <Link href="/settings" aria-label={t("layout.settings")}>
          <Button size="icon" variant="ghost">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
      }
    >
      <div className="mb-5 flex gap-2">
        <Link href="/create" className="flex-1">
          <Button className="w-full">
            <Plus className="h-5 w-5" />
            {t("dashboard.new")}
          </Button>
        </Link>
        <Link href="/" className="flex-1">
          <Button variant="outline" className="w-full">
            <Users className="h-5 w-5" />
            {t("dashboard.join")}
          </Button>
        </Link>
      </div>

      {!mounted ? null : campaigns.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="text-4xl">🪄</span>
          <div className="font-display text-xl">{t("dashboard.empty.title")}</div>
          <p className="max-w-xs text-sm text-muted-foreground">
            {t("dashboard.empty.desc")}
          </p>
        </Card>
      ) : (
        <ul className="space-y-2.5">
          {campaigns.map((c) => {
            const members = getMembers(c.id).length;
            const sessions = getSessions(c.id).filter(
              (s) => s.status === "confirmed",
            ).length;
            return (
              <li key={c.id}>
                <Link href={`/campaign/?code=${c.inviteCode}`} className="block">
                  <Card className="flex items-center gap-3 p-4 transition-all hover:border-primary/60">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-lg">
                        {c.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline">{t("dashboard.players", { n: members })}</Badge>
                        {sessions > 0 && (
                          <Badge variant="primary">{t("dashboard.booked", { n: sessions })}</Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}
