"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { sendQuickMessage } from "@/lib/utils/quick-message";

export function QuickAskButton({
  postId,
  authorId,
}: {
  postId: string;
  authorId: string;
}) {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault(); // Prevent Link navigation
    e.stopPropagation();

    if (sent || loading) return;
    setLoading(true);

    const result = await sendQuickMessage({
      postId,
      authorId,
      message: "Hi! Is this still available?",
    });

    if ("error" in result) {
      toast.error(result.error);
    } else {
      setSent(true);
      toast.success("Message sent! They'll get back to you.");
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={sent || loading}
      aria-label="Ask if this item is still available"
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
        sent
          ? "bg-emerald-500/10 text-emerald-600"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      }`}
    >
      <MessageCircle className="h-3 w-3" />
      {loading ? "Sending..." : sent ? "Sent!" : "Available?"}
    </button>
  );
}
