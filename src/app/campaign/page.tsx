"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Share2, UserPlus, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MemberList } from "@/components/campaign/member-list";
import { InviteSheet } from "@/components/campaign/invite-sheet";
import { useCampaign, useEnsureCampaign, useMounted } from "@/lib/hooks";
import { joinAsGuest } from "@/lib/store";
import { TIME_SLOT_LABELS } from "@/lib/core/types";
import { formatDateLabel } from "@/lib/utils";

function CampaignInner() {
  const code = useSearchParams().get("code") ?? "";
  const mounted = useMounted();
  const loading = useEnsureCampaign(code);
  const bundle = useCampaign(code);
  const [invite, setInvite] = React.useState(false);
  const [name, setName] = React.useState("");

  const { campaign, members, round, sessions, myMemberId } = bundle;

  if (mounted && !loading && !campaign) {
    return (
      <AppShell title="Campaign" back="/">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            We couldn&apos;t find a campaign for code{" "}
            <span className="font-mono">{code}</span> on this device.
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">Back home</Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  if (!campaign) return <AppShell title="Campaign" back="/" />;

  const join = () => {
    if (!name.trim()) return;
    joinAsGuest(campaign.id, name.trim());
    setName("");
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

        {/* Join gate for new guests */}
        {mounted && !myMemberId && (
          <Card className="border-primary/50">
            <CardContent className="pt-4">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <UserPlus className="h-4 w-4 text-primary" />
                Join this campaign
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && join()}
                  autoFocus
                />
                <Button onClick={join}>Join</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                No account needed — just a name your party recognises.
              </p>
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
      <CampaignInner />
    </React.Suspense>
  );
}
