"use client";

import { useState, useRef, useCallback } from "react";
import type { ChatMessage, ChatPost, SSEEvent } from "@/types/chat";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    // Guard: max 500 characters per message
    const trimmed = content.slice(0, 500);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      posts: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        const errorText = res.status === 429
          ? "You're sending messages too quickly. Please wait a moment."
          : "Chat request failed";
        throw new Error(errorText);
      }

      reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      const accumulatedPosts: ChatPost[] = [];

      function updateAssistant() {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, content: accumulatedText, posts: [...accumulatedPosts] }
              : m
          )
        );
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split on double-newline (proper SSE delimiter)
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const parsed: SSEEvent = JSON.parse(jsonStr);

            if (parsed.type === "text") {
              accumulatedText += parsed.content;
              updateAssistant();
            } else if (parsed.type === "tool_result" && parsed.data) {
              accumulatedPosts.push(...parsed.data);
              updateAssistant();
            } else if (parsed.type === "error") {
              console.error("[chat] Server error:", parsed.message);
              accumulatedText += `\n\nSorry, something went wrong. Please try again.`;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, content: accumulatedText, posts: [...accumulatedPosts], isStreaming: false }
                    : m
                )
              );
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      // Mark streaming complete
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id ? { ...m, isStreaming: false } : m
        )
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const errorMsg = (err as Error).message || "Sorry, I couldn't process your request. Please try again.";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? {
                  ...m,
                  content: errorMsg,
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } finally {
      await reader?.cancel();
      setIsLoading(false);
      abortRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, isLoading, sendMessage, clearMessages, stopStreaming };
}
