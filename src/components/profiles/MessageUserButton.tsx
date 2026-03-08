"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function MessageUserButton({ targetUserId }: { targetUserId: string }) {
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleMessage() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please sign in");
      setLoading(false);
      return;
    }

    // Find existing direct conversation (no post_id)
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .is("post_id", null)
      .or(
        `and(participant_a.eq.${user.id},participant_b.eq.${targetUserId}),and(participant_a.eq.${targetUserId},participant_b.eq.${user.id})`
      )
      .limit(1)
      .maybeSingle();

    if (existing) {
      router.push(`/messages/${existing.id}`);
      return;
    }

    // Create new direct conversation
    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert({
        participant_a: user.id,
        participant_b: targetUserId,
      })
      .select("id")
      .single();

    if (error || !conversation) {
      toast.error("Failed to start conversation");
      setLoading(false);
      return;
    }

    router.push(`/messages/${conversation.id}`);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMessage}
      disabled={loading}
    >
      <MessageCircle className="mr-1.5 h-4 w-4" />
      {loading ? "Opening..." : "Message"}
    </Button>
  );
}
