"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Share2, Sparkles, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AvailabilityGrid } from "@/components/availability/availability-grid";
import { StatusChip } from "@/components/availability/status";
import { RecommendationCard } from "@/components/scoring/recommendation-card";
import { InviteSheet } from "@/components/campaign/invite-sheet";
import { MemberAvatar } from "@/components/campaign/member-list";
import {
  useCampaign,
  useEnsureCampaign,
  useMounted,
  useScores,
  statusFor,
} from "@/lib/hooks";
import { confirmSession, joinAsGuest, setAvailability } from "@/lib/store";
import {
  AvailabilityStatus,
  TIME_SLOT_LABELS,
  TimeSlot,
} from "@/lib/core/types";
import { SlotScore } from "@/lib/core/scoring";
import { formatDateLabel } from "@/lib/utils";

function PlanInner() {
  const code = useSearchParams().get("code") ?? "";
  const router = useRouter();
  const mounted = useMounted();
  const loading = useEnsureCampaign(code);
  const bundle = useCampaign(code);
  const model = useScores(bundle);
  const [invite, setInvite] = React.useState(false);
  const [name, setName] = React.useState("");
  const [confirmSlot, setConfirmSlot] = React.useState<SlotScore | null>(null);
  const [notes, setNotes] = React.useState("");

  const { campaign, round, members, entries, myMemberId } = bundle;

  if (mounted && !loading && !campaign) {
    return (
      <AppShell title="Planner" back="/">
        <p className="text-center text-muted-foreground">Campaign not found.</p>
      </AppShell>
    );
  }
  if (!campaign || !round) return <AppShell title="Planner" back="/" />;

  const isDM = myMemberId === campaign.hostId;

  // Join gate
  if (mounted && !myMemberId) {
    return (
      <AppShell title={campaign.name} back={`/campaign/?code=${code}`}>
        <Card className="border-primary/50">
          <CardContent className="pt-4">
            <div className="mb-2 font-medium">Add your name to start marking</div>
            <div className="flex gap-2">
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  name.trim() &&
                  joinAsGuest(campaign.id, name.trim())
                }
                autoFocus
              />
              <Button
                onClick={() =>
                  name.trim() && joinAsGuest(campaign.id, name.trim())
                }
              >
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const onSet = (date: string, slot: TimeSlot, status: AvailabilityStatus) => {
    if (!myMemberId) return;
    setAvailability(round.id, myMemberId, date, slot, status);
  };

  const openConfirm = (slot: SlotScore) => {
    setNotes("");
    setConfirmSlot(slot);
  };

  const doConfirm = () => {
    if (!confirmSlot || !myMemberId) return;
    const session = confirmSession(
      {
        campaignId: campaign.id,
        roundId: round.id,
        date: confirmSlot.date,
        timeSlot: confirmSlot.timeSlot,
        notes: notes || undefined,
      },
      myMemberId,
    );
    setConfirmSlot(null);
    router.push(`/session/?code=${code}&id=${session.id}`);
  };

  const responded = new Set(entries.map((e) => e.memberId)).size;

  return (
    <AppShell
      title={campaign.name}
      back={`/campaign/?code=${code}`}
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
        {/* Recommendations */}
        {model.recommendations.length > 0 ? (
          <section className="space-y-2">
            {model.recommendations.map((rec) => (
              <RecommendationCard
                key={rec.kind}
                rec={rec}
                canConfirm={isDM}
                onConfirm={() => openConfirm(rec.slot)}
              />
            ))}
          </section>
        ) : (
          <Card className="flex items-center gap-3 p-4">
            <Sparkles className="h-5 w-5 text-accent" />
            <p className="text-sm text-muted-foreground">
              Mark a few slots and recommendations will appear here.
            </p>
          </Card>
        )}

        {/* Party progress */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {members.slice(0, 6).map((m) => (
              <MemberAvatar
                key={m.id}
                member={m}
                className="ring-2 ring-background"
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {responded}/{members.length} responded
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Tap a cell to cycle:</span>
          <StatusChip status="available" className="text-xs" />
          <StatusChip status="maybe" className="text-xs" />
          <StatusChip status="unavailable" className="text-xs" />
        </div>

        {/* The grid */}
        <AvailabilityGrid
          round={round}
          model={model}
          canEdit={!!myMemberId}
          myStatus={(date, slot) =>
            statusFor(entries, myMemberId, date, slot)
          }
          onSet={onSet}
        />

        <p className="text-center text-xs text-muted-foreground">
          Numbers show players available (+maybe). The crown marks the best slot.
          {!isDM && " The DM confirms the final session."}
        </p>
      </div>

      {/* Confirm session modal */}
      <Modal
        open={!!confirmSlot}
        onClose={() => setConfirmSlot(null)}
        title="Confirm this session?"
      >
        {confirmSlot && (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary/10 p-3 text-center">
              <div className="font-display text-xl">
                {formatDateLabel(confirmSlot.date).weekday}{" "}
                {formatDateLabel(confirmSlot.date).day} ·{" "}
                {TIME_SLOT_LABELS[confirmSlot.timeSlot]}
              </div>
              <div className="text-sm text-muted-foreground">
                {confirmSlot.available} available
                {confirmSlot.maybe > 0 && ` (+${confirmSlot.maybe} maybe)`}
              </div>
            </div>
            <Textarea
              placeholder="Notes for the party (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button className="w-full" size="lg" onClick={doConfirm}>
              <CalendarCheck className="h-5 w-5" />
              Confirm session
            </Button>
          </div>
        )}
      </Modal>

      <InviteSheet
        open={invite}
        onClose={() => setInvite(false)}
        code={campaign.inviteCode}
        campaignName={campaign.name}
      />
    </AppShell>
  );
}

export default function PlanPage() {
  return (
    <React.Suspense fallback={<AppShell title="Planner" back="/" />}>
      <PlanInner />
    </React.Suspense>
  );
}
