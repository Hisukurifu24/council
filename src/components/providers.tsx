"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { hydrate, setBackend } from "@/lib/store";
import { isSupabaseEnabled } from "@/lib/supabase/client";
import { SupabaseBackend } from "@/lib/backends/supabase-backend";

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

export function Providers({ children }: { children: React.ReactNode }) {
  // Pick the backend (Supabase when env vars are set, else local) and start it.
  useEffect(() => {
    if (isSupabaseEnabled()) setBackend(new SupabaseBackend());
    hydrate();
  }, []);

  return <ThemeProvider>{children}</ThemeProvider>;
}
