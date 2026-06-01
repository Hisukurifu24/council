"use client";

import * as React from "react";
import { LogIn, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useCurrentAccount, useMounted } from "@/lib/hooks";
import { logIn, signUp } from "@/lib/store";
import { logInSchema, signUpSchema } from "@/lib/core/schemas";
import { useI18n } from "@/lib/i18n";

/**
 * Renders children only when an account is logged in; otherwise shows a simple
 * email + password login / sign-up form. Used to gate create / join / dashboard.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const mounted = useMounted();
  const account = useCurrentAccount();

  if (!mounted) return <AppShell title={t("brand.title")} back="/" />;
  if (account) return <>{children}</>;

  return (
    <AppShell title={t("auth.signIn")} back="/">
      <AuthForm />
    </AppShell>
  );
}

export function AuthForm({ onAuthed }: { onAuthed?: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [remember, setRemember] = React.useState(true);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const isSignup = mode === "signup";

  const submit = async () => {
    if (busy) return;
    setError("");

    const parsed = isSignup
      ? signUpSchema.safeParse({ email, password, displayName })
      : logInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("common.formError"));
      return;
    }

    setBusy(true);
    try {
      const res = isSignup
        ? await signUp(parsed.data as Parameters<typeof signUp>[0], remember)
        : await logIn(parsed.data as Parameters<typeof logIn>[0], remember);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onAuthed?.();
    } catch (e) {
      setError(
        e instanceof Error
          ? t("common.unexpectedErrorWith", { msg: e.message })
          : t("common.unexpectedError"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="text-center">
          <div className="font-display text-2xl">
            {isSignup ? t("auth.signupTitle") : t("auth.loginTitle")}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup ? t("auth.signupSub") : t("auth.loginSub")}
          </p>
        </div>

        {isSignup && (
          <div>
            <Label htmlFor="displayName">{t("auth.displayName")}</Label>
            <Input
              id="displayName"
              placeholder={t("auth.displayNamePlaceholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
            />
          </div>
        )}

        <div>
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>

        <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-accent"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          {t("auth.rememberMe")}
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="w-full" size="lg" onClick={submit} disabled={busy}>
          {isSignup ? (
            <UserPlus className="h-5 w-5" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
          {busy
            ? t("common.pleaseWait")
            : isSignup
              ? t("auth.createAccount")
              : t("auth.logIn")}
        </Button>

        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            setError("");
            setMode(isSignup ? "login" : "signup");
          }}
        >
          {isSignup ? t("auth.toLogin") : t("auth.toSignup")}
        </button>
      </CardContent>
    </Card>
  );
}
