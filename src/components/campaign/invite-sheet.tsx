"use client";

import * as React from "react";
import QRCode from "qrcode";
import { Check, Copy, MessageSquare, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteSheet({
  open,
  onClose,
  code,
  campaignName,
}: {
  open: boolean;
  onClose: () => void;
  code: string;
  campaignName: string;
}) {
  const [qr, setQr] = React.useState<string>("");
  const [copied, setCopied] = React.useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/campaign/?code=${code}`
      : `/campaign/?code=${code}`;

  React.useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 220,
      color: { dark: "#1a1430", light: "#ffffff" },
    }).then(setQr);
  }, [open, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${campaignName}" on Council`,
          text: `Mark your availability for ${campaignName}:`,
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  const discordUrl = url; // pasting the link in Discord unfurls it

  return (
    <Modal open={open} onClose={onClose} title="Invite your party">
      <div className="flex flex-col items-center gap-4">
        {qr ? (
          <img
            src={qr}
            alt="QR code to join the campaign"
            className="h-44 w-44 rounded-2xl border border-border bg-white p-2"
          />
        ) : (
          <div className="h-44 w-44 animate-pulse rounded-2xl bg-secondary" />
        )}

        <div className="text-center">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Invite code
          </div>
          <div className="font-display text-3xl tracking-[0.3em]">{code}</div>
        </div>

        <div className="flex w-full gap-2">
          <Input readOnly value={url} className="text-sm" />
          <Button variant="secondary" size="icon" onClick={copy} aria-label="Copy link">
            {copied ? (
              <Check className="h-5 w-5 text-[hsl(var(--avail))]" />
            ) : (
              <Copy className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="grid w-full grid-cols-2 gap-2">
          <Button variant="outline" onClick={shareNative}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <a
            href={`https://discord.com/channels/@me`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={copy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5865F2] px-5 text-sm font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <MessageSquare className="h-4 w-4" />
            Discord
          </a>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Link copied — paste it into your Discord channel. No account needed to join.
        </p>
      </div>
    </Modal>
  );
}
