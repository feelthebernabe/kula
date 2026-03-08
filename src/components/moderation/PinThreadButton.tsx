"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Pin, PinOff } from "lucide-react";
import { toast } from "sonner";

interface PinThreadButtonProps {
  threadId: string;
  communityId: string;
  isPinned: boolean;
  currentUserId: string;
}

export function PinThreadButton({
  threadId,
  communityId,
  isPinned,
  currentUserId,
}: PinThreadButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [updating, setUpdating] = useState(false);

  async function handleTogglePin() {
    setUpdating(true);
    const newPinned = !isPinned;

    const { error } = await supabase
      .from("discussion_threads")
      .update({ pinned: newPinned })
      .eq("id", threadId);

    if (error) {
      toast.error("Failed to update pin status");
    } else {
      await supabase.from("mod_actions").insert({
        community_id: communityId,
        moderator_id: currentUserId,
        action_type: newPinned ? "thread_pinned" : "thread_unpinned",
        target_content_type: "thread",
        target_content_id: threadId,
      });

      toast.success(newPinned ? "Thread pinned" : "Thread unpinned");
      router.refresh();
    }
    setUpdating(false);
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs"
      onClick={handleTogglePin}
      disabled={updating}
      title={isPinned ? "Unpin thread" : "Pin thread"}
    >
      {isPinned ? (
        <>
          <PinOff className="mr-1 h-3.5 w-3.5" />
          Unpin
        </>
      ) : (
        <>
          <Pin className="mr-1 h-3.5 w-3.5" />
          Pin
        </>
      )}
    </Button>
  );
}
