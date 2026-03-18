"use client";

import { useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, SendHorizonal, Sparkles, Trash2 } from "lucide-react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useChat } from "@/lib/hooks/use-chat";
import { useSpeechMode } from "@/lib/hooks/use-speech-mode";
import type { ChatMessage } from "@/types/chat";

const SUGGESTIONS = [
  "Who can help me move this weekend?",
  "I'm looking for a drill I can borrow",
  "What food is available in the community?",
  "I can teach guitar, who's interested?",
];

export function AskKulaPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { messages, isLoading, sendMessage, clearMessages } = useChat();

  const speech = useSpeechMode(sendMessage);
  const prevMessagesRef = useRef<ChatMessage[]>([]);

  // Speak each newly completed assistant message
  useEffect(() => {
    const prev = prevMessagesRef.current;
    prevMessagesRef.current = messages;
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prevMsg = prev[i];
      if (
        msg.role === "assistant" &&
        !msg.isStreaming &&
        prevMsg?.role === "assistant" &&
        prevMsg.isStreaming &&
        msg.content
      ) {
        speech.speak(msg.content);
      }
    }
  }, [messages, speech]);

  const hasFirstReply = messages.some((m) => m.role === "assistant" && !m.isStreaming && m.content);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col p-0 sm:max-w-md"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base">Ask Kula</SheetTitle>
                <SheetDescription className="text-xs">
                  Your community assistant
                </SheetDescription>
              </div>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearMessages}
                className="h-8 w-8 text-muted-foreground"
                aria-label="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-hidden px-4">
          {messages.length === 0 ? (
            <ScrollArea className="h-full">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  Hi! I'm Kula Assistant
                </h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-[260px]">
                  I can help you find people, services, and things in your
                  community. Try asking:
                </p>
                <div className="mt-6 grid gap-2 w-full max-w-[280px]">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <ChatMessages messages={messages} />
          )}
        </div>

        {/* Speech mode bar */}
        {hasFirstReply && (
          speech.enabled ? (
            <div className={`shrink-0 flex items-center justify-between gap-3 border-t px-4 py-3 transition-colors ${
              speech.isListening ? "border-red-200 bg-red-50 dark:bg-red-950/20" : "border-border/40"
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  speech.isListening
                    ? "animate-pulse bg-red-500 text-white shadow-md shadow-red-200"
                    : speech.isSpeaking
                    ? "bg-primary/20 text-primary"
                    : "bg-primary/10 text-primary"
                }`}>
                  <Mic className="h-4 w-4" />
                </div>
                <span className="truncate text-sm text-muted-foreground">
                  {speech.isListening
                    ? speech.transcript || "Listening…"
                    : speech.isSpeaking
                    ? "Speaking…"
                    : "Voice mode on"}
                </span>
              </div>
              <button onClick={speech.disable} className="shrink-0 text-xs text-muted-foreground hover:text-foreground">
                Turn off
              </button>
            </div>
          ) : (
            <div className="shrink-0 flex justify-center border-t border-border/40 py-3">
              <button
                onClick={speech.enable}
                className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 transition-all hover:bg-primary/10 active:scale-[0.98]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <Mic className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Tap to talk</p>
                  <p className="text-xs text-muted-foreground">Hands-free voice mode</p>
                </div>
              </button>
            </div>
          )
        )}

        {/* Footer */}
        <div className="border-t px-4 py-3">
          {speech.transcript && (
            <p className="mb-2 rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">
              {speech.transcript}
            </p>
          )}
          <div className="flex items-end gap-2">
            <ChatInput onSend={sendMessage} disabled={isLoading} />
            {speech.enabled && !speech.isListening && !speech.isSpeaking && (
              <Button
                size="icon"
                onClick={speech.enable}
                className="h-9 w-9 shrink-0 bg-primary/10 text-primary hover:bg-primary/20"
                aria-label="Resume listening"
              >
                <SendHorizonal className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
