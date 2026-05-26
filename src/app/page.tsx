"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Settings, Sparkles, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useI18n, LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [code, setCode] = React.useState("");

  const join = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    router.push(`/campaign/?code=${c}`);
  };

  const features = [
    {
      Icon: Zap,
      title: t("landing.feature.instantTitle"),
      desc: t("landing.feature.instantDesc"),
    },
    {
      Icon: Sparkles,
      title: t("landing.feature.smartTitle"),
      desc: t("landing.feature.smartDesc"),
    },
    {
      Icon: Users,
      title: t("landing.feature.frictionlessTitle"),
      desc: t("landing.feature.frictionlessDesc"),
    },
  ];

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5">
      <header className="flex h-16 items-center justify-between gap-2">
        <span className="font-display text-xl">⚔️ Council</span>
        <div className="flex items-center gap-2">
          <div
            role="radiogroup"
            aria-label={t("settings.language")}
            className="flex shrink-0 overflow-hidden rounded-lg border border-border/60 text-xs"
          >
            {LOCALES.map((l: Locale) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={locale === l}
                onClick={() => setLocale(l)}
                className={cn(
                  "px-2 py-1 font-medium uppercase transition-colors",
                  locale === l
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary/60",
                )}
                title={LOCALE_LABELS[l]}
              >
                {l}
              </button>
            ))}
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              {t("landing.myCampaigns")}
            </Button>
          </Link>
          <Link href="/settings" aria-label={t("settings.title")}>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {t("landing.tagline")}
          </div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            {t("landing.title.line1")}{" "}
            <span className="text-primary">{t("landing.title.discord")}</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            {t("landing.subtitle")}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/create" className="flex-1">
              <Button size="lg" className="w-full">
                <CalendarCheck className="h-5 w-5" />
                {t("landing.create")}
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => setJoinOpen(true)}
            >
              <Users className="h-5 w-5" />
              {t("landing.join")}
            </Button>
          </div>
        </motion.div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {features.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/60 bg-card/40 p-4"
            >
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <div className="font-semibold">{title}</div>
              <div className="text-sm text-muted-foreground">{desc}</div>
            </div>
          ))}
        </div>
      </main>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title={t("landing.joinModalTitle")}>
        <div className="space-y-3">
          <Input
            autoFocus
            placeholder={t("landing.invitePlaceholder")}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && join()}
            className="text-center text-lg tracking-[0.3em]"
            maxLength={8}
          />
          <Button className="w-full" onClick={join}>
            {t("common.continue")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {t("landing.gotLink")}
          </p>
        </div>
      </Modal>
    </div>
  );
}
