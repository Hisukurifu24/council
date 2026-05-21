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

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const account = useCurrentAccount();
  const [confirm, setConfirm] = React.useState(false);

  return (
    <AppShell title="Settings" back="/dashboard">
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
                Log out
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex items-center justify-between pt-4">
            <div>
              <div className="font-medium">Appearance</div>
              <div className="text-sm text-muted-foreground">
                Dark mode is on by default.
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
          <CardContent className="pt-4">
            <div className="font-medium">Local data</div>
            <div className="mb-3 text-sm text-muted-foreground">
              Reset clears the campaigns this device remembers. Shared campaigns
              stay on the server — you can rejoin them with the invite link.
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
                  Confirm reset
                </Button>
                <Button variant="ghost" onClick={() => setConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setConfirm(true)}>
                <Trash2 className="h-4 w-4" />
                Reset local data
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="px-1 pt-2 text-center text-xs text-muted-foreground">
          Council · D&D Session Planner · v0.1
        </p>
      </div>
    </AppShell>
  );
}
