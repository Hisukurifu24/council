"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Share2, Sparkles, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { AvailabilityGrid } from "@/components/availability/availability-grid";
import { BulkMark } from "@/components/availability/bulk-mark";
import { VoiceMark } from "@/components/availability/voice-mark";
import { StatusChip } from "@/components/availability/status";
import { VoterBreakdown } from "@/components/availability/voter-breakdown";
import { RecommendationCard } from "@/components/scoring/recommendation-card";
import { InviteSheet } from "@/components/campaign/invite-sheet";
import { MemberAvatar } from "@/components/campaign/member-list";
import {
  useCampaign,
  useCurrentAccount,
  useEnsureCampaign,
  useMounted,
  useScores,
  statusFor,
} from "@/lib/hooks";
import {
  confirmSession,
  joinAsGuest,
  setAvailability,
  setAvailabilityBulk,
} from "@/lib/store";
import { AvailabilityStatus, TimeSlot } from "@/lib/core/types";
import { SlotScore } from "@/lib/core/scoring";
import { isSlotPast, todayISO } from "@/lib/utils";
import { useI18n, useFormatDate, useTimeSlotLabel } from "@/lib/i18n";

function PlanInner() {
  const { t } = useI18n();
  const fmt = useFormatDate();
  const slotLabel = useTimeSlotLabel();
  const code = useSearchParams().get("code") ?? "";
  const router = useRouter();
  const mounted = useMounted();
  const account = useCurrentAccount();
  const loading = useEnsureCampaign(code);
  const bundle = useCampaign(code);
  const model = useScores(bundle);
  const [invite, setInvite] = React.useState(false);
  const [confirmSlot, setConfirmSlot] = React.useState<SlotScore | null>(null);
  const [notes, setNotes] = React.useState("");
  const [votersSlot, setVotersSlot] = React.useState<{
    date: string;
    timeSlot: TimeSlot;
  } | null>(null);

  const { campaign, round, members, entries, myMemberId } = bundle;

  if (mounted && !loading && !campaign) {
    return (
      <AppShell title={t("plan.title")} back="/">
        <p className="text-center text-muted-foreground">{t("plan.notFound")}</p>
      </AppShell>
    );
  }
  if (!campaign || !round) return <AppShell title={t("plan.title")} back="/" />;

  const isDM = myMemberId === campaign.hostId;

  // Join gate
  if (mounted && !myMemberId) {
    return (
      <AppShell title={campaign.name} back={`/campaign/?code=${code}`}>
        <Card className="border-primary/50">
          <CardContent className="pt-4">
            <div className="mb-2 font-medium">{t("plan.joinTitle")}</div>
            <p className="mb-3 text-sm text-muted-foreground">
              {t("campaign.joinAs", { name: account?.displayName ?? "" })}
            </p>
            <Button
              className="w-full"
              onClick={() => account && joinAsGuest(campaign.id, account.displayName)}
            >
              {t("campaign.joinCta")}
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const onSet = (date: string, slot: TimeSlot, status: AvailabilityStatus) => {
    if (!myMemberId) return;
    setAvailability(round.id, myMemberId, date, slot, status);
  };

  const onBulk = (
    cells: { date: string; timeSlot: TimeSlot }[],
    status: AvailabilityStatus,
  ) => {
    if (!myMemberId) return;
    setAvailabilityBulk(round.id, myMemberId, cells, status);
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
  const minP = campaign.settings.minPlayers;
  const playerLabel = minP === 1 ? t("plan.player") : t("plan.players");

  return (
    <AppShell
      title={campaign.name}
      back={`/campaign/?code=${code}`}
      right={
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("layout.invite")}
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
              {t("plan.empty")}
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
            {t("plan.responded", { a: responded, b: members.length })}
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border/60 bg-card/40 px-3 py-2 text-xs">
          <span className="text-muted-foreground">
            {t("plan.legend.hint")}
          </span>
          <StatusChip status="available" className="text-xs" />
          <StatusChip status="maybe" className="text-xs" />
          <StatusChip status="unavailable" className="text-xs" />
        </div>

        {/* Voice / typed marking */}
        {myMemberId && (
          <VoiceMark round={round} today={todayISO()} onApply={onBulk} />
        )}

        {/* Bulk marking */}
        {myMemberId && <BulkMark round={round} onApply={onBulk} />}

        {/* The grid */}
        <AvailabilityGrid
          round={round}
          model={model}
          canEdit={!!myMemberId}
          myStatus={(date, slot) =>
            statusFor(entries, myMemberId, date, slot)
          }
          onSet={onSet}
          isPast={isSlotPast}
          onShowVoters={(date, slot) =>
            setVotersSlot({ date, timeSlot: slot })
          }
        />

        <p className="text-center text-xs text-muted-foreground">
          {t("plan.footer", { n: minP, playerLabel })}
          {!isDM && t("plan.footer.dmHint")}
        </p>
      </div>

      {/* Confirm session modal */}
      <Modal
        open={!!confirmSlot}
        onClose={() => setConfirmSlot(null)}
        title={t("plan.confirmModal.title")}
      >
        {confirmSlot && (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary/10 p-3 text-center">
              <div className="font-display text-xl">
                {fmt(confirmSlot.date).weekday}{" "}
                {fmt(confirmSlot.date).day} ·{" "}
                {slotLabel(confirmSlot.timeSlot)}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("plan.confirmModal.available", { n: confirmSlot.available })}
                {confirmSlot.maybe > 0 &&
                  t("plan.confirmModal.maybe", { n: confirmSlot.maybe })}
              </div>
            </div>
            <Textarea
              placeholder={t("plan.confirmModal.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button className="w-full" size="lg" onClick={doConfirm}>
              <CalendarCheck className="h-5 w-5" />
              {t("plan.confirmCta")}
            </Button>
          </div>
        )}
      </Modal>

      {/* Who voted what for a slot */}
      <Modal
        open={!!votersSlot}
        onClose={() => setVotersSlot(null)}
        title={
          votersSlot
            ? `${fmt(votersSlot.date).weekday} ${
                fmt(votersSlot.date).day
              } · ${slotLabel(votersSlot.timeSlot)}`
            : undefined
        }
      >
        {votersSlot && (
          <VoterBreakdown
            members={members}
            entries={entries}
            date={votersSlot.date}
            timeSlot={votersSlot.timeSlot}
            hostId={campaign.hostId}
          />
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
    <React.Suspense fallback={<PlanFallback />}>
      <AuthGate>
        <PlanInner />
      </AuthGate>
    </React.Suspense>
  );
}

function PlanFallback() {
  const { t } = useI18n();
  return <AppShell title={t("plan.title")} back="/" />;
}
