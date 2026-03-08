"use client";

import { useEffect, useRef, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { ChatPostCard } from "./ChatPostCard";
import type { ChatMessage } from "@/types/chat";

export function ChatMessages({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isNearBottom.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  useEffect(() => {
    if (isNearBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto space-y-4 py-4"
    >
      {messages.map((msg) => (
        <div key={msg.id}>
          {msg.role === "user" ? (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-sm text-primary-foreground">
                {msg.content}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="max-w-[85%] space-y-2">
                <div className="rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm text-foreground">
                  {msg.content || (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <span className="animate-pulse">Thinking</span>
                      <span className="animate-bounce [animation-delay:0.1s]">
                        .
                      </span>
                      <span className="animate-bounce [animation-delay:0.2s]">
                        .
                      </span>
                      <span className="animate-bounce [animation-delay:0.3s]">
                        .
                      </span>
                    </span>
                  )}
                  {msg.isStreaming && msg.content && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
                  )}
                </div>

                {/* Post cards */}
                {msg.posts && msg.posts.length > 0 && (
                  <div className="space-y-2">
                    {msg.posts.map((post) => (
                      <ChatPostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
