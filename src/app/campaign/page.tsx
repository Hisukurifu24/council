"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Share2,
  UserPlus,
  CalendarCheck,
  Minus,
  Plus,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AuthGate } from "@/components/auth/auth-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input, Label } from "@/components/ui/input";
import { MemberList } from "@/components/campaign/member-list";
import { InviteSheet } from "@/components/campaign/invite-sheet";
import {
  useCampaign,
  useCurrentAccount,
  useEnsureCampaign,
  useMounted,
} from "@/lib/hooks";
import {
  deleteCampaign,
  joinAsGuest,
  renameCampaign,
  updateMinPlayers,
} from "@/lib/store";
import { useI18n, useFormatDate, useTimeSlotLabel } from "@/lib/i18n";

function CampaignInner() {
  const { t } = useI18n();
  const fmt = useFormatDate();
  const slotLabel = useTimeSlotLabel();
  const code = useSearchParams().get("code") ?? "";
  const router = useRouter();
  const mounted = useMounted();
  const account = useCurrentAccount();
  const loading = useEnsureCampaign(code);
  const bundle = useCampaign(code);
  const [invite, setInvite] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const { campaign, members, round, sessions, myMemberId } = bundle;

  if (mounted && !loading && !campaign) {
    return (
      <AppShell title={t("campaign.title")} back="/">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {t("campaign.notFound", { code })}
          </p>
          <Link href="/" className="mt-4 inline-block">
            <Button variant="outline">{t("campaign.backHome")}</Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  if (!campaign) return <AppShell title={t("campaign.title")} back="/" />;

  const isDM = myMemberId === campaign.hostId;

  const join = () => {
    if (!account) return;
    joinAsGuest(campaign.id, account.displayName);
  };

  const openRename = () => {
    setNameDraft(campaign.name);
    setRenaming(true);
  };

  const saveRename = () => {
    renameCampaign(campaign.id, nameDraft);
    setRenaming(false);
  };

  const doDelete = () => {
    deleteCampaign(campaign.id);
    setConfirmDelete(false);
    router.push("/dashboard");
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
          aria-label={t("layout.invite")}
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
                {t("campaign.joinTitle")}
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                {t("campaign.joinAs", { name: account?.displayName ?? "" })}
              </p>
              <Button className="w-full" onClick={join}>
                {t("campaign.joinCta")}
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
                  {t("campaign.minPlayersTitle")}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("campaign.minPlayersDesc")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("create.decrease")}
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
                  aria-label={t("create.increase")}
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

        {/* DM: rename the campaign */}
        {myMemberId && isDM && (
          <Card>
            <CardContent className="flex items-center justify-between pt-4">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2 font-medium">
                  <Pencil className="h-4 w-4 text-primary" />
                  {t("campaign.rename.title")}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {campaign.name}
                </p>
              </div>
              <Button variant="outline" onClick={openRename}>
                {t("campaign.rename.cta")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Primary CTA */}
        {myMemberId && (
          <Link href={`/plan/?code=${campaign.inviteCode}`} className="block">
            <Button className="w-full" size="lg">
              <CalendarDays className="h-5 w-5" />
              {t("campaign.openPlanner")}
            </Button>
          </Link>
        )}

        {/* Confirmed sessions */}
        {confirmed.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              {t("campaign.bookedSessions")}
            </h2>
            <ul className="space-y-2">
              {confirmed.map((s) => {
                const { weekday, day } = fmt(s.date);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/session/?code=${campaign.inviteCode}&id=${s.id}`}
                      className="block"
                    >
                      <Card className="flex items-center gap-3 p-3 transition-all hover:border-primary/60">
                        <div className="rounded-xl bg-[hsl(var(--avail)/0.15)] p-2 text-[hsl(var(--avail))]">
                          <CalendarCheck className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">
                            {weekday} {day} · {slotLabel(s.timeSlot)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("campaign.confirmed")}
                          </div>
                        </div>
                        <Badge variant="avail">{t("campaign.locked")}</Badge>
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
              {t("campaign.party", { n: members.length })}
            </h2>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => setInvite(true)}
            >
              {t("campaign.inviteShort")}
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

        {/* DM: delete the campaign */}
        {myMemberId && isDM && (
          <Card className="border-destructive/40">
            <CardContent className="flex items-center justify-between pt-4">
              <div className="pr-3">
                <div className="font-medium">{t("campaign.deleteTitle")}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("campaign.deleteDesc")}
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <InviteSheet
        open={invite}
        onClose={() => setInvite(false)}
        code={campaign.inviteCode}
        campaignName={campaign.name}
      />

      <Modal
        open={renaming}
        onClose={() => setRenaming(false)}
        title={t("campaign.rename.modal")}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">{t("campaign.rename.title")}</Label>
            <Input
              id="campaign-name"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={80}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") saveRename();
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={saveRename}
              disabled={!nameDraft.trim()}
            >
              {t("common.save")}
            </Button>
            <Button variant="ghost" onClick={() => setRenaming(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("campaign.deleteConfirmTitle")}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("campaign.deleteConfirmDesc", { name: campaign.name })}
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" className="flex-1" onClick={doDelete}>
              <Trash2 className="h-4 w-4" />
              {t("campaign.deleteCta")}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

export default function CampaignPage() {
  return (
    <React.Suspense fallback={<CampaignFallback />}>
      <AuthGate>
        <CampaignInner />
      </AuthGate>
    </React.Suspense>
  );
}

function CampaignFallback() {
  const { t } = useI18n();
  return <AppShell title={t("campaign.title")} back="/" />;
}
