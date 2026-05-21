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

/**
 * Renders children only when an account is logged in; otherwise shows a simple
 * email + password login / sign-up form. Used to gate create / join / dashboard.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  const account = useCurrentAccount();

  if (!mounted) return <AppShell title="Council" back="/" />;
  if (account) return <>{children}</>;

  return (
    <AppShell title="Sign in" back="/">
      <AuthForm />
    </AppShell>
  );
}

export function AuthForm({ onAuthed }: { onAuthed?: () => void }) {
  const [mode, setMode] = React.useState<"login" | "signup">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
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
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }

    setBusy(true);
    try {
      const res = isSignup
        ? await signUp(parsed.data as Parameters<typeof signUp>[0])
        : await logIn(parsed.data as Parameters<typeof logIn>[0]);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onAuthed?.();
    } catch (e) {
      setError(
        e instanceof Error ? `Unexpected error: ${e.message}` : "Unexpected error.",
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
            {isSignup ? "Create your account" : "Welcome back"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSignup
              ? "Just an email and password — so your campaigns follow you."
              : "Log in to see your campaigns."}
          </p>
        </div>

        {isSignup && (
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              placeholder="Dungeon Master"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
            />
          </div>
        )}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="w-full" size="lg" onClick={submit} disabled={busy}>
          {isSignup ? (
            <UserPlus className="h-5 w-5" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
          {busy
            ? "Please wait…"
            : isSignup
              ? "Create account"
              : "Log in"}
        </Button>

        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            setError("");
            setMode(isSignup ? "login" : "signup");
          }}
        >
          {isSignup
            ? "Already have an account? Log in"
            : "New here? Create an account"}
        </button>
      </CardContent>
    </Card>
  );
}
