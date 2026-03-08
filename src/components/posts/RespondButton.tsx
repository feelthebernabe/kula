"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

interface RespondButtonProps {
  postId: string;
  authorId: string;
}

export function RespondButton({ postId, authorId }: RespondButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRespond() {
    if (submittingRef.current) return;
    if (!message.trim()) {
      toast.error("Please write a message");
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please sign in");
      return;
    }

    // Check if conversation already exists for this post between these users
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("post_id", postId)
      .or(
        `and(participant_a.eq.${user.id},participant_b.eq.${authorId}),and(participant_a.eq.${authorId},participant_b.eq.${user.id})`
      )
      .single();

    let conversationId: string;

    if (existing) {
      conversationId = existing.id;
    } else {
      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert({
          post_id: postId,
          participant_a: user.id,
          participant_b: authorId,
        })
        .select()
        .single();

      if (convError || !conversation) {
        toast.error("Failed to start conversation");
        setLoading(false);
        return;
      }

      conversationId = conversation.id;
    }

    // Send the message
    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: message.trim(),
    });

    if (msgError) {
      toast.error("Failed to send message");
      setLoading(false);
      return;
    }

    toast.success("Message sent!");
    router.push(`/messages/${conversationId}`);
  }

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="w-full"
        size="lg"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Respond to this post
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Write your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            setShowForm(false);
            setMessage("");
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleRespond} disabled={loading || !message.trim()}>
          {loading ? "Sending..." : "Send Message"}
        </Button>
      </div>
    </div>
  );
}
