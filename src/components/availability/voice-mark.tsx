"use client";

import * as React from "react";
import { Mic, Square, Sparkles, Check, X, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AvailabilityStatus,
  SchedulingRound,
  TIME_SLOT_LABELS,
  TimeSlot,
} from "@/lib/core/types";
import {
  parseAvailabilitySpeech,
  ParseLang,
  ParseResult,
} from "@/lib/core/voice-parse";
import { cn, formatDateLabel } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/use-speech";
import { STATUS_META } from "./status";

interface Props {
  round: SchedulingRound;
  today: string;
  onApply: (
    cells: { date: string; timeSlot: TimeSlot }[],
    status: AvailabilityStatus,
  ) => void;
  disabled?: boolean;
}

const PLACEHOLDER: Record<ParseLang, string> = {
  en: 'e.g. "free every Saturday evening but busy Sunday afternoon"',
  it: 'es. "libero ogni sabato sera ma occupato domenica pomeriggio"',
};

const STATUS_ORDER: AvailabilityStatus[] = ["available", "maybe", "unavailable"];

export function VoiceMark({ round, today, onApply, disabled }: Props) {
  const [lang, setLang] = React.useState<ParseLang>("en");
  const [text, setText] = React.useState("");
  const [preview, setPreview] = React.useState<ParseResult | null>(null);
  const [appliedCount, setAppliedCount] = React.useState<number | null>(null);
  const speech = useSpeechRecognition();
  const wasListening = React.useRef(false);

  const runParse = React.useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (!t) return;
      setAppliedCount(null);
      setPreview(
        parseAvailabilitySpeech(t, {
          today,
          windowDates: round.dates,
          lang,
        }),
      );
    },
    [today, round.dates, lang],
  );

  // Mirror live transcript into the field; auto-parse when listening stops.
  React.useEffect(() => {
    if (speech.listening) setText(speech.transcript);
  }, [speech.transcript, speech.listening]);

  React.useEffect(() => {
    if (wasListening.current && !speech.listening && speech.transcript.trim()) {
      runParse(speech.transcript);
    }
    wasListening.current = speech.listening;
  }, [speech.listening, speech.transcript, runParse]);

  const toggleMic = () => {
    if (speech.listening) speech.stop();
    else speech.start(lang === "it" ? "it-IT" : "en-US");
  };

  const confirm = () => {
    if (!preview) return;
    const groups = new Map<
      AvailabilityStatus,
      { date: string; timeSlot: TimeSlot }[]
    >();
    for (const s of preview.slots) {
      const cells = groups.get(s.status) ?? [];
      cells.push({ date: s.date, timeSlot: s.timeSlot });
      groups.set(s.status, cells);
    }
    for (const [status, cells] of groups) onApply(cells, status);
    setAppliedCount(preview.slots.length);
    setPreview(null);
    setText("");
    window.setTimeout(() => setAppliedCount(null), 2500);
  };

  const cancel = () => setPreview(null);

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-accent" />
          Say or type your availability
        </div>
        <div className="flex overflow-hidden rounded-lg border border-border/60 text-xs">
          {(["en", "it"] as ParseLang[]).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className={cn(
                "px-2.5 py-1 font-medium uppercase transition-colors",
                lang === l
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runParse(text);
            }
          }}
          placeholder={PLACEHOLDER[lang]}
          disabled={disabled || speech.listening}
          aria-label="Availability sentence"
          className="h-11 text-sm"
        />
        {speech.supported && (
          <Button
            type="button"
            size="icon"
            variant={speech.listening ? "destructive" : "accent"}
            onClick={toggleMic}
            disabled={disabled}
            aria-label={speech.listening ? "Stop listening" : "Speak"}
            className={cn("shrink-0", speech.listening && "animate-pulse")}
          >
            {speech.listening ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => runParse(text)}
          disabled={disabled || !text.trim()}
          aria-label="Parse sentence"
          className="shrink-0"
        >
          <CornerDownLeft className="h-4 w-4" />
        </Button>
      </div>

      {!speech.supported && (
        <p className="text-xs text-muted-foreground">
          Voice isn&apos;t supported in this browser — type a sentence instead.
        </p>
      )}
      {speech.listening && (
        <p className="text-xs text-accent">Listening… speak now.</p>
      )}
      {speech.error && (
        <p className="text-xs text-[hsl(var(--unavail))]">{speech.error}</p>
      )}
      {appliedCount !== null && (
        <p className="flex items-center gap-1.5 text-xs text-[hsl(var(--avail))]">
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          Marked {appliedCount} slot{appliedCount === 1 ? "" : "s"}.
        </p>
      )}

      {preview && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
          {preview.matched ? (
            <>
              {STATUS_ORDER.filter((s) =>
                preview.slots.some((p) => p.status === s),
              ).map((status) => {
                const { label, color, Icon } = STATUS_META[status];
                const cells = preview.slots.filter((p) => p.status === status);
                return (
                  <div key={status} className="space-y-1.5">
                    <div
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color }}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
                      {label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cells.map((c) => {
                        const d = formatDateLabel(c.date);
                        return (
                          <span
                            key={`${c.date}-${c.timeSlot}`}
                            className="rounded-md border border-border/60 bg-card/60 px-2 py-0.5 text-[11px]"
                          >
                            {d.weekday} {d.day} · {TIME_SLOT_LABELS[c.timeSlot]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Couldn&apos;t understand that. Try e.g. &ldquo;free Saturday
              evening&rdquo;.
            </p>
          )}

          {preview.warnings.length > 0 && (
            <ul className="space-y-0.5 text-[11px] text-[hsl(var(--maybe))]">
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            {preview.matched && (
              <Button size="sm" className="flex-1" onClick={confirm}>
                <Check className="h-4 w-4" />
                Apply
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className={preview.matched ? "" : "flex-1"}
              onClick={cancel}
            >
              <X className="h-4 w-4" />
              {preview.matched ? "Cancel" : "Dismiss"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
