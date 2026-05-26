"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Moon, Sun, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/providers";
import { logOut, resetStore } from "@/lib/store";
import { useCurrentAccount } from "@/lib/hooks";
import { useI18n, LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const account = useCurrentAccount();
  const [confirm, setConfirm] = React.useState(false);

  return (
    <AppShell title={t("settings.title")} back="/dashboard">
      <div className="space-y-3">
        {account && (
          <Card>
            <CardContent className="flex items-center justify-between pt-4">
              <div className="min-w-0">
                <div className="truncate font-medium">{account.displayName}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {account.email}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  logOut();
                  router.push("/");
                }}
              >
                <LogOut className="h-4 w-4" />
                {t("settings.logout")}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex items-center justify-between pt-4">
            <div>
              <div className="font-medium">{t("settings.appearance")}</div>
              <div className="text-sm text-muted-foreground">
                {t("settings.appearanceDesc")}
              </div>
            </div>
            <Button variant="outline" size="icon" onClick={toggle}>
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between gap-3 pt-4">
            <div className="min-w-0">
              <div className="font-medium">{t("settings.language")}</div>
              <div className="text-sm text-muted-foreground">
                {t("settings.languageDesc")}
              </div>
            </div>
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
                    "px-3 py-1.5 font-medium uppercase transition-colors",
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="font-medium">{t("settings.localData")}</div>
            <div className="mb-3 text-sm text-muted-foreground">
              {t("settings.localDataDesc")}
            </div>
            {confirm ? (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    resetStore();
                    setConfirm(false);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("settings.confirmReset")}
                </Button>
                <Button variant="ghost" onClick={() => setConfirm(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" />
                {t("settings.reset")}
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="px-1 pt-2 text-center text-xs text-muted-foreground">
          {t("settings.footer")}
        </p>
      </div>
    </AppShell>
  );
}
