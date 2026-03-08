"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Trash2 } from "lucide-react";
import { ChatMessages } from "./ChatMessages";
import { ChatInput } from "./ChatInput";
import { useChat } from "@/lib/hooks/use-chat";

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

        {/* Footer */}
        <div className="border-t px-4 py-3">
          <ChatInput onSend={sendMessage} disabled={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
