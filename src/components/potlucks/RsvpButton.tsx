"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

interface RsvpButtonProps {
  potluckId: string;
  currentUserId: string | null;
  currentRsvpStatus: "confirmed" | "cancelled" | null;
  isFull: boolean;
}

export function RsvpButton({
  potluckId,
  currentUserId,
  currentRsvpStatus,
  isFull,
}: RsvpButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleRsvp() {
    if (!currentUserId) {
      toast.error("Please log in to RSVP");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("potluck_rsvps").upsert(
      {
        potluck_id: potluckId,
        user_id: currentUserId,
        status: "confirmed",
      },
      { onConflict: "potluck_id,user_id" }
    );

    if (error) {
      toast.error("Failed to RSVP");
    } else {
      toast.success("You're going!");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleCancel() {
    if (!currentUserId) return;

    setLoading(true);

    const { error } = await supabase
      .from("potluck_rsvps")
      .update({ status: "cancelled" })
      .eq("potluck_id", potluckId)
      .eq("user_id", currentUserId);

    if (error) {
      toast.error("Failed to cancel RSVP");
    } else {
      toast.success("RSVP cancelled");
      router.refresh();
    }
    setLoading(false);
  }

  if (currentRsvpStatus === "confirmed") {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled className="text-green-600">
          <Check className="mr-1.5 h-4 w-4" />
          You&apos;re going
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={loading}
        >
          <X className="mr-1.5 h-4 w-4" />
          Cancel
        </Button>
      </div>
    );
  }

  if (isFull) {
    return (
      <Button size="sm" disabled>
        Full
      </Button>
    );
  }

  return (
    <Button size="sm" onClick={handleRsvp} disabled={loading}>
      {loading ? "..." : "RSVP"}
    </Button>
  );
}
