"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { Message } from "@/types/database";

interface MessageThreadProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}

export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark unread messages as read
  useEffect(() => {
    const unreadIds = messages
      .filter((m) => m.sender_id !== currentUserId && !m.read)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;

    supabase
      .from("messages")
      .update({ read: true })
      .in("id", unreadIds)
      .then();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentUserId]);

  // Subscribe to realtime messages
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage("");

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: messageText,
    });

    if (error) {
      toast.error("Failed to send message");
      setNewMessage(messageText);
    }

    setSending(false);
  }

  return (
    <>
      {/* Message list */}
      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">
              Start the conversation! Say hello.
            </p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    isMine
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {formatDistanceToNow(new Date(msg.created_at!), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reply Chips */}
      {!newMessage && messages.length < 3 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border pt-3 pb-1">
          {[
            "Is this still available?",
            "When can I pick up?",
            "I can bring it back by...",
            "Thanks, it was great!",
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setNewMessage(chip)}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className={`flex gap-2 ${newMessage || messages.length >= 3 ? "border-t border-border" : ""} pt-2`}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          aria-label="Type a message"
          className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </>
  );
}
