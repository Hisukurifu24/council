"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Share2,
  UserPlus,
  CalendarCheck,
  Minus,
  Plus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MemberList } from "@/components/campaign/member-list";
import { InviteSheet } from "@/components/campaign/invite-sheet";
import {
  useCampaign,
  useCurrentAccount,
  useEnsureCampaign,
  useMounted,
} from "@/lib/hooks";
import { joinAsGuest, updateMinPlayers } from "@/lib/store";
import { TIME_SLOT_LABELS } from "@/lib/core/types";
import { formatDateLabel } from "@/lib/utils";

function CampaignInner() {
  const code = useSearchParams().get("code") ?? "";
  const mounted = useMounted();
  const account = useCurrentAccount();
  const loading = useEnsureCampaign(code);
  const bundle = useCampaign(code);
  const [invite, setInvite] = React.useState(false);

  const { campaign, members, round, sessions, myMemberId } = bundle;

  if (mounted && !loading && !campaign) {
    return (
      <AppShell title="Campaign" back="/">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            We couldn&apos;t find a campaign for code{" "}
            <span className="font-mono">{code}</span>.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">Back home</Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  if (!campaign) return <AppShell title="Campaign" back="/" />;

  const isDM = myMemberId === campaign.hostId;

  const join = () => {
    if (!account) return;
    joinAsGuest(campaign.id, account.displayName);
  };

  const confirmed = sessions.filter((s) => s.status === "confirmed");

  return (
    <AppShell
      title={campaign.name}
      back="/dashboard"
      right={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Invite"
          onClick={() => setInvite(true)}
        >
          <Share2 className="h-5 w-5" />
        </Button>
      }
    >
      <div className="space-y-5">
        {campaign.description && (
          <p className="text-sm text-muted-foreground">{campaign.description}</p>
        )}

        {/* Join gate for new members */}
        {mounted && !myMemberId && (
          <Card className="border-primary/50">
            <CardContent className="pt-4">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <UserPlus className="h-4 w-4 text-primary" />
                Join this campaign
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                You&apos;ll join as{" "}
                <span className="font-medium text-foreground">
                  {account?.displayName}
                </span>
                .
              </p>
              <Button className="w-full" onClick={join}>
                Join campaign
              </Button>
            </CardContent>
          </Card>
        )}

        {/* DM: minimum players for a viable session */}
        {myMemberId && isDM && (
          <Card>
            <CardContent className="flex items-center justify-between pt-4">
              <div className="pr-3">
                <div className="flex items-center gap-2 font-medium">
                  <Users className="h-4 w-4 text-primary" />
                  Min players per session
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Available players (excluding you) needed to flag a viable day.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Decrease"
                  onClick={() =>
                    updateMinPlayers(
                      campaign.id,
                      Math.max(0, campaign.settings.minPlayers - 1),
                    )
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-8 text-center font-display text-xl tabular-nums">
                  {campaign.settings.minPlayers}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Increase"
                  onClick={() =>
                    updateMinPlayers(
                      campaign.id,
                      Math.min(50, campaign.settings.minPlayers + 1),
                    )
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Primary CTA */}
        {myMemberId && (
          <Link href={`/plan/?code=${campaign.inviteCode}`}>
            <Button className="w-full" size="lg">
              <CalendarDays className="h-5 w-5" />
              Open availability planner
            </Button>
          </Link>
        )}

        {/* Confirmed sessions */}
        {confirmed.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Booked sessions
            </h2>
            <ul className="space-y-2">
              {confirmed.map((s) => {
                const { weekday, day } = formatDateLabel(s.date);
                return (
                  <li key={s.id}>
                    <Link href={`/session/?code=${campaign.inviteCode}&id=${s.id}`}>
                      <Card className="flex items-center gap-3 p-3 transition-all hover:border-primary/60">
                        <div className="rounded-xl bg-[hsl(var(--avail)/0.15)] p-2 text-[hsl(var(--avail))]">
                          <CalendarCheck className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {weekday} {day} · {TIME_SLOT_LABELS[s.timeSlot]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Confirmed
                          </div>
                        </div>
                        <Badge variant="avail">Locked</Badge>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Members */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Party ({members.length})
            </h2>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setInvite(true)}
            >
              + Invite
            </button>
          </div>
          <MemberList
            members={members}
            round={round}
            entries={bundle.entries}
            hostId={campaign.hostId}
            myMemberId={myMemberId}
          />
        </section>
      </div>

      <InviteSheet
        open={invite}
        onClose={() => setInvite(false)}
        code={campaign.inviteCode}
        campaignName={campaign.name}
      />
    </AppShell>
  );
}

export default function CampaignPage() {
  return (
    <React.Suspense fallback={<AppShell title="Campaign" back="/" />}>
      <AuthGate>
        <CampaignInner />
      </AuthGate>
    </React.Suspense>
  );
}
