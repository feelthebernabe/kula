"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Fire once per page session as soon as any speech-capable component mounts.
// Wakes the Kokoro model on HF so it's ready before the user enables voice mode.
let ttsWarmupFired = false;
function warmupTTS() {
  if (ttsWarmupFired || typeof window === "undefined") return;
  ttsWarmupFired = true;
  fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ warmup: true }),
  }).catch(() => {});
}
export { warmupTTS };

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/gm, "")
    .replace(/`{1,3}[^`\n]*`{1,3}/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, ". ")
    .trim();
}

// Truncate to roughly the first 2-3 sentences for TTS -- long AI responses
// sound bad read in full and users don't need to hear every word.
function truncateForSpeech(text: string, maxChars = 400): string {
  if (text.length <= maxChars) return text;
  // Try to cut at a sentence boundary
  const cutoff = text.slice(0, maxChars);
  const lastPeriod = Math.max(
    cutoff.lastIndexOf(". "),
    cutoff.lastIndexOf("? "),
    cutoff.lastIndexOf("! ")
  );
  return lastPeriod > 100 ? cutoff.slice(0, lastPeriod + 1) : cutoff;
}

export function useSpeechMode(onSend: (text: string) => void) {
  const [enabled, setEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Refs so closures inside recognition/audio callbacks always see fresh values
  const enabledRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const transcriptRef = useRef("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onSendRef = useRef(onSend);
  onSendRef.current = onSend;

  // Forward-declared so speak() and startListening() can call each other via refs
  const startListeningRef = useRef<() => void>(() => {});
  const speakRef = useRef<(text: string) => void>(() => {});

  startListeningRef.current = () => {
    if (!enabledRef.current || typeof window === "undefined") return;
    if (recognitionRef.current) return; // already running

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as unknown[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript as string)
        .join("");
      setTranscript(text);
      transcriptRef.current = text;
    };

    rec.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      const text = transcriptRef.current.trim();
      setTranscript("");
      transcriptRef.current = "";

      if (!enabledRef.current) return;

      if (text) {
        onSendRef.current(text);
      } else if (!isSpeakingRef.current) {
        setTimeout(() => {
          if (enabledRef.current && !isSpeakingRef.current) {
            startListeningRef.current();
          }
        }, 600);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (e.error === "aborted") return;
      recognitionRef.current = null;
      setIsListening(false);
      if (e.error === "no-speech" && enabledRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          if (enabledRef.current) startListeningRef.current();
        }, 600);
      }
    };

    try {
      rec.start();
      setIsListening(true);
      recognitionRef.current = rec;
    } catch {
      // mic permission denied or unavailable
    }
  };

  speakRef.current = (text: string) => {
    if (!enabledRef.current || typeof window === "undefined") return;

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const clean = truncateForSpeech(stripMarkdown(text));

    if (!clean.trim()) {
      setTimeout(() => {
        if (enabledRef.current) startListeningRef.current();
      }, 300);
      return;
    }

    isSpeakingRef.current = true;
    setIsSpeaking(true);

    const onDone = () => {
      audioRef.current = null;
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      setTimeout(() => {
        if (enabledRef.current) startListeningRef.current();
      }, 350);
    };

    fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("TTS failed");
        return res.blob();
      })
      .then((blob) => {
        if (!enabledRef.current) return; // disabled while fetching
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          onDone();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          onDone();
        };
        audio.play().catch(onDone);
      })
      .catch(onDone);
  };

  const enable = useCallback(() => {
    if (typeof window === "undefined") return;
    setEnabled(true);
    enabledRef.current = true;
    isSpeakingRef.current = false;
    setTimeout(() => startListeningRef.current(), 150);
  }, []);

  const disable = useCallback(() => {
    setEnabled(false);
    enabledRef.current = false;
    isSpeakingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsListening(false);
    setIsSpeaking(false);
    setTranscript("");
    transcriptRef.current = "";
  }, []);

  const speak = useCallback((text: string) => {
    speakRef.current(text);
  }, []);

  // Pre-warm Kokoro on first mount
  useEffect(() => {
    warmupTTS();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      enabledRef.current = false;
      recognitionRef.current?.stop();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return { enabled, isListening, isSpeaking, transcript, enable, disable, speak };
}
