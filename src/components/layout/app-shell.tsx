"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function AppShell({
  children,
  title,
  back,
  right,
  className,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
  back?: string | boolean;
  right?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const { t } = useI18n();

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col">
      {(title || back || right) && (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 glass px-3">
          {back ? (
            typeof back === "string" ? (
              <Link
                href={back}
                aria-label={t("common.back")}
                className="rounded-full p-2 hover:bg-secondary"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            ) : (
              <button
                onClick={() => router.back()}
                aria-label={t("common.back")}
                className="rounded-full p-2 hover:bg-secondary"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )
          ) : (
            <Link href="/" className="flex items-center gap-2 pl-1" aria-label={t("layout.home")}>
              <span className="text-xl">⚔️</span>
            </Link>
          )}
          <div className="min-w-0 flex-1 truncate font-display text-lg">
            {title}
          </div>
          {right}
          <button
            onClick={toggle}
            aria-label={t("layout.toggleTheme")}
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </header>
      )}
      <main
        className={cn(
          "flex-1 px-4 pt-5",
          "pb-[calc(2rem+env(safe-area-inset-bottom))]",
          className,
        )}
      >
        {children}
      </main>
    </div>
  );
}
