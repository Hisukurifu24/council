"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { hydrate, verifySession } from "@/lib/store";
import { isSupabaseEnabled } from "@/lib/supabase/client";
import { LanguageProvider, useI18n } from "@/lib/i18n";

type Theme = "dark" | "light";
const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "dark", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("dndtime:theme") as Theme) || "dark";
    setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("dndtime:theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

function SupabaseSetupNotice() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md space-y-3 rounded-2xl border border-border bg-card p-6 text-center">
        <div className="font-display text-2xl">{t("setup.title")}</div>
        <p className="text-sm text-muted-foreground">{t("setup.body")}</p>
      </div>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Supabase is the only backend. With no env vars there's nothing to talk to,
  // so we show a setup notice instead of a silently broken app.
  const configured = isSupabaseEnabled();

  // hydrate() is guarded by an internal `hydrated` flag, so it runs exactly once
  // even under StrictMode's double-invoked effect.
  useEffect(() => {
    if (!configured) return;
    hydrate();
    void verifySession();
  }, [configured]);

  return (
    <LanguageProvider>
      <ThemeProvider>
        {configured ? children : <SupabaseSetupNotice />}
      </ThemeProvider>
    </LanguageProvider>
  );
}
