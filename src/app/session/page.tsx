"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  CalendarPlus,
  Download,
  ExternalLink,
  Lock,
  NotebookPen,
  Trash2,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoterBreakdown } from "@/components/availability/voter-breakdown";
import { useCampaign, useEnsureCampaign, useMounted } from "@/lib/hooks";
import { cancelSession, getSession } from "@/lib/store";
import { useI18n, useFormatDate, useTimeSlotLabel } from "@/lib/i18n";
import {
  buildCalendarEvent,
  googleCalendarUrl,
  toIcsString,
} from "@/lib/core/calendar";
import { downloadTextFile } from "@/lib/utils";

function SessionInner() {
  const { t } = useI18n();
  const fmt = useFormatDate();
  const slotLabel = useTimeSlotLabel();
  const params = useSearchParams();
  const code = params.get("code") ?? "";
  const id = params.get("id") ?? "";
  const router = useRouter();
  const mounted = useMounted();
  const loading = useEnsureCampaign(code);
  const bundle = useCampaign(code);
  const session = mounted ? getSession(id) : undefined;
  const [canceling, setCanceling] = React.useState(false);

  if (!mounted || loading)
    return <AppShell title={t("session.title")} back={`/campaign/?code=${code}`} />;

  if (!session || !bundle.campaign) {
    return (
      <AppShell title={t("session.title")} back={`/campaign/?code=${code}`}>
        <p className="text-center text-muted-foreground">{t("session.notFound")}</p>
      </AppShell>
    );
  }

  const isDM = bundle.myMemberId === bundle.campaign?.hostId;
  const isCanceled = session.status === "canceled";

  const doCancel = () => {
    cancelSession(id);
    router.push(`/campaign/?code=${code}`);
  };

  const { weekday, day } = fmt(session.date);
  const calEvent = buildCalendarEvent(session, bundle.campaign.name);

  const downloadIcs = () =>
    downloadTextFile(
      `council-session-${session.id}.ics`,
      "text/calendar",
      toIcsString(calEvent),
    );

  return (
    <AppShell title={bundle.campaign.name} back={`/campaign/?code=${code}`}>
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="bg-[hsl(var(--avail)/0.12)] p-5 text-center">
            <div className="mb-2 inline-flex items-center gap-1.5">
              <Badge variant="avail">
                <CalendarCheck className="h-3.5 w-3.5" /> {t("campaign.confirmed")}
              </Badge>
              {session.locked && (
                <Badge variant="outline">
                  <Lock className="h-3 w-3" /> {t("campaign.locked")}
                </Badge>
              )}
            </div>
            <div className="font-display text-3xl">
              {weekday} {day}
            </div>
            <div className="text-lg text-muted-foreground">
              {slotLabel(session.timeSlot)}
            </div>
          </div>
          <CardContent className="pt-4">
            {session.notes ? (
              <div className="flex gap-2 text-sm">
                <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p>{session.notes}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("session.noNotes")}</p>
            )}
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Users className="h-4 w-4" /> {t("session.whoVoted")}
          </h2>
          <VoterBreakdown
            members={bundle.members}
            entries={bundle.entries}
            date={session.date}
            timeSlot={session.timeSlot}
            hostId={bundle.campaign.hostId}
          />
        </section>

        {!isCanceled && (
          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <CalendarPlus className="h-4 w-4" /> {t("session.addToCalendar")}
            </h2>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={downloadIcs}
              >
                <Download className="h-4 w-4" />
                {t("session.downloadIcs")}
              </Button>
              <a
                href={googleCalendarUrl(calEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button variant="secondary" className="w-full">
                  <ExternalLink className="h-4 w-4" />
                  {t("session.googleCalendar")}
                </Button>
              </a>
            </div>
          </section>
        )}

        <Link href={`/plan/?code=${code}`} className="block">
          <Button variant="outline" className="w-full">
            {t("session.backToPlanner")}
          </Button>
        </Link>

        {isDM && !isCanceled && (
          canceling ? (
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={doCancel}
              >
                <Trash2 className="h-4 w-4" />
                {t("session.cancelYes")}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCanceling(false)}
              >
                {t("session.cancelKeep")}
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setCanceling(true)}
            >
              <Trash2 className="h-4 w-4" />
              {t("session.cancelCta")}
            </Button>
          )
        )}
      </div>
    </AppShell>
  );
}

export default function SessionPage() {
  return (
    <React.Suspense fallback={<SessionFallback />}>
      <SessionInner />
    </React.Suspense>
  );
}

function SessionFallback() {
  const { t } = useI18n();
  return <AppShell title={t("session.title")} back="/" />;
}
