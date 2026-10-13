"use client";

import * as React from "react";
import { Ban, ChevronRight, Crown, UserMinus } from "lucide-react";
import { CampaignMember } from "@/lib/core/types";
import { banMember, kickMember, transferHost } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { MemberAvatar } from "@/components/campaign/member-list";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Action = "host" | "kick" | "ban";

/** DM-only sheet: pick an action for a player, then confirm it. */
export function ManageMemberSheet({
  campaignId,
  member,
  onClose,
}: {
  campaignId: string;
  member: CampaignMember | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [action, setAction] = React.useState<Action | null>(null);

  // Reset to the action list whenever the sheet opens for someone new.
  React.useEffect(() => setAction(null), [member?.id]);

  const name = member?.guestName ?? t("members.player");

  const actions: {
    id: Action;
    icon: React.ElementType;
    destructive?: boolean;
  }[] = [
    { id: "host", icon: Crown },
    { id: "kick", icon: UserMinus, destructive: true },
    // Bans are keyed by account; a member without one can only be removed.
    ...(member?.accountId
      ? [{ id: "ban" as const, icon: Ban, destructive: true }]
      : []),
  ];

  const run = () => {
    if (!member || !action) return;
    if (action === "host") transferHost(campaignId, member.id);
    else if (action === "kick") kickMember(campaignId, member.id);
    else banMember(campaignId, member.id);
    onClose();
  };

  return (
    <Modal open={!!member} onClose={onClose} title={t("manage.title")}>
      {member && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <MemberAvatar member={member} />
            <span className="truncate font-medium">{name}</span>
          </div>

          {action === null ? (
            <ul className="space-y-2">
              {actions.map(({ id, icon: Icon, destructive }) => (
                <li key={id}>
                  <button
                    onClick={() => setAction(id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-3 py-3 text-left transition-colors hover:bg-secondary/60"
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        destructive ? "text-destructive" : "text-accent",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {t(`manage.${id}`)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t(`manage.${id}Desc`)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t(`manage.${action}Confirm`, { name })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant={action === "host" ? "default" : "destructive"}
                  className="flex-1"
                  onClick={run}
                >
                  {t(`manage.${action}Cta`)}
                </Button>
                <Button variant="ghost" onClick={() => setAction(null)}>
                  {t("common.back")}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
