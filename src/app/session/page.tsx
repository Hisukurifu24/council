"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, Lock, NotebookPen, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/components/campaign/member-list";
import { useCampaign, useEnsureCampaign, useMounted } from "@/lib/hooks";
import { cancelSession, getSession } from "@/lib/store";
import { TIME_SLOT_LABELS } from "@/lib/core/types";
import { formatDateLabel } from "@/lib/utils";

function SessionInner() {
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
    return <AppShell title="Session" back={`/campaign/?code=${code}`} />;

  if (!session || !bundle.campaign) {
    return (
      <AppShell title="Session" back={`/campaign/?code=${code}`}>
        <p className="text-center text-muted-foreground">Session not found.</p>
      </AppShell>
    );
  }

  const isDM = bundle.myMemberId === bundle.campaign?.hostId;
  const isCanceled = session.status === "canceled";

  const doCancel = () => {
    cancelSession(id);
    router.push(`/campaign/?code=${code}`);
  };

  const { weekday, day } = formatDateLabel(session.date);
  // who is available for this slot
  const present = bundle.members.filter((m) =>
    bundle.entries.some(
      (e) =>
        e.memberId === m.id &&
        e.date === session.date &&
        e.timeSlot === session.timeSlot &&
        (e.status === "available" || e.status === "maybe"),
    ),
  );

  return (
    <AppShell title={bundle.campaign.name} back={`/campaign/?code=${code}`}>
      <div className="space-y-5">
        <Card className="overflow-hidden">
          <div className="bg-[hsl(var(--avail)/0.12)] p-5 text-center">
            <div className="mb-2 inline-flex items-center gap-1.5">
              <Badge variant="avail">
                <CalendarCheck className="h-3.5 w-3.5" /> Confirmed
              </Badge>
              {session.locked && (
                <Badge variant="outline">
                  <Lock className="h-3 w-3" /> Locked
                </Badge>
              )}
            </div>
            <div className="font-display text-3xl">
              {weekday} {day}
            </div>
            <div className="text-lg text-muted-foreground">
              {TIME_SLOT_LABELS[session.timeSlot]}
            </div>
          </div>
          <CardContent className="pt-4">
            {session.notes ? (
              <div className="flex gap-2 text-sm">
                <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p>{session.notes}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No notes added.</p>
            )}
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Users className="h-4 w-4" /> Expected ({present.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {present.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded-full border border-border/60 bg-card/50 py-1 pl-1 pr-3"
              >
                <MemberAvatar member={m} className="h-6 w-6 text-[10px]" />
                <span className="text-sm">{m.guestName}</span>
              </div>
            ))}
          </div>
        </section>

        <Link href={`/plan/?code=${code}`}>
          <Button variant="outline" className="w-full">
            Back to planner
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
                Yes, cancel session
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setCanceling(false)}
              >
                Keep it
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setCanceling(true)}
            >
              <Trash2 className="h-4 w-4" />
              Cancel session
            </Button>
          )
        )}
      </div>
    </AppShell>
  );
}

export default function SessionPage() {
  return (
    <React.Suspense fallback={<AppShell title="Session" back="/" />}>
      <SessionInner />
    </React.Suspense>
  );
}
