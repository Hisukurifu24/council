"use client";

import * as React from "react";

export interface SpeechState {
  supported: boolean;
  listening: boolean;
  transcript: string; // interim + final, accumulated for the current session
  error: string | null;
  start: (lang: "en-US" | "it-IT") => void;
  stop: () => void;
}

function getCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function mapError(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed")
    return "Microphone permission denied.";
  if (code === "no-speech") return "Didn't catch that — try again.";
  if (code === "aborted") return "";
  return "Voice input failed — try typing instead.";
}

/**
 * Thin wrapper over the browser-native Web Speech API. Returns supported:false
 * where the API is missing (e.g. Firefox, future Capacitor WebView) so callers
 * can fall back to typed input. No external service or key — fully free.
 *
 * A single recognition instance is created lazily and reused across presses.
 * `continuous: true` keeps capturing across pauses so a multi-day sentence
 * ("free saturday and sunday evening") is heard in full — the caller stops it
 * explicitly. Recreating/aborting an instance on every press is avoided because
 * that churn can hang Chrome's speech engine.
 */
export function useSpeechRecognition(): SpeechState {
  const [supported, setSupported] = React.useState(false);
  const [listening, setListening] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<SpeechRecognition | null>(null);
  const listeningRef = React.useRef(false);
  const watchdogRef = React.useRef<number | null>(null);

  const clearWatchdog = React.useCallback(() => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    setSupported(getCtor() !== null);
    return () => {
      clearWatchdog();
      const r = recognitionRef.current;
      recognitionRef.current = null;
      listeningRef.current = false;
      if (r) {
        r.onstart = r.onresult = r.onerror = r.onend = null;
        try {
          r.abort();
        } catch {
          /* already stopped */
        }
      }
    };
  }, [clearWatchdog]);

  const stop = React.useCallback(() => {
    clearWatchdog();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* not running */
    }
  }, [clearWatchdog]);

  const start = React.useCallback((lang: "en-US" | "it-IT") => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    // Ignore a second press while a session is live — restarting an active
    // recognizer throws and can wedge the engine.
    if (listeningRef.current) return;

    // Tear down any previous instance and create a fresh one so the language
    // is guaranteed to take effect (Chrome can keep a reused instance's first
    // lang).
    const prev = recognitionRef.current;
    if (prev) {
      prev.onstart = prev.onresult = prev.onerror = prev.onend = null;
      try {
        prev.abort();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      listeningRef.current = true;
      setError(null);
      setListening(true);
    };
    recognition.onresult = (event) => {
      clearWatchdog(); // speech is flowing — the engine works for this language
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recognition.onerror = (event) => {
      clearWatchdog();
      const msg = mapError(event.error);
      if (msg) setError(msg);
      listeningRef.current = false;
      setListening(false);
    };
    recognition.onend = () => {
      clearWatchdog();
      listeningRef.current = false;
      setListening(false);
    };
    recognitionRef.current = recognition;

    setTranscript("");
    try {
      recognition.start();
      // Some engines (e.g. a missing language model) start but never emit a
      // result, an error, or an end — leaving the UI stuck on "Listening".
      // If nothing arrives in time, stop and tell the user.
      clearWatchdog();
      watchdogRef.current = window.setTimeout(() => {
        if (listeningRef.current) {
          setError(
            `No ${lang === "it-IT" ? "Italian" : "English"} speech detected — this browser may not have that voice language installed. Type the sentence instead.`,
          );
          try {
            recognition.stop();
          } catch {
            /* ignore */
          }
        }
      }, 9000);
    } catch {
      listeningRef.current = false;
      setListening(false);
      setError("Couldn't start voice input — try again or type instead.");
    }
  }, [clearWatchdog]);

  return { supported, listening, transcript, error, start, stop };
}
