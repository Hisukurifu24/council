"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { motion } from "framer-motion";
import { CalendarCheck, Sparkles, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

export default function LandingPage() {
  const router = useRouter();
  const [joinOpen, setJoinOpen] = React.useState(false);
  const [code, setCode] = React.useState("");

  const join = () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    router.push(`/campaign/?code=${c}`);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-5">
      <header className="flex h-16 items-center justify-between">
        <span className="font-display text-xl">⚔️ Council</span>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            My campaigns
          </Button>
        </Link>
      </header>

      <main className="flex flex-1 flex-col justify-center py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Find the night the whole party can play
          </div>
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">
            Stop herding cats in{" "}
            <span className="text-primary">Discord.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Everyone taps their availability across the next few weeks and
            Council instantly surfaces the best session time. No spreadsheets —
            just a quick sign-in so your campaigns follow you.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/create" className="flex-1">
              <Button size="lg" className="w-full">
                <CalendarCheck className="h-5 w-5" />
                Create a campaign
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={() => setJoinOpen(true)}
            >
              <Users className="h-5 w-5" />
              Join with a code
            </Button>
          </div>
        </motion.div>

        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            { Icon: Zap, t: "Instant", d: "Tap to mark a slot. Scores update live across every device." },
            { Icon: Sparkles, t: "Smart", d: "Best / backup / avoid picks computed from real attendance." },
            { Icon: Users, t: "Frictionless", d: "Share a link or QR. Players sign in and start tapping." },
          ].map(({ Icon, t, d }) => (
            <div
              key={t}
              className="rounded-2xl border border-border/60 bg-card/40 p-4"
            >
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <div className="font-semibold">{t}</div>
              <div className="text-sm text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </main>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join a campaign">
        <div className="space-y-3">
          <Input
            autoFocus
            placeholder="Invite code (e.g. K7P2QX)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && join()}
            className="text-center text-lg tracking-[0.3em]"
            maxLength={8}
          />
          <Button className="w-full" onClick={join}>
            Continue
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Got a link instead? Just open it — it takes you straight in.
          </p>
        </div>
      </Modal>
    </div>
  );
}
