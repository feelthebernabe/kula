"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function JoinGroupButton({ communityId }: { communityId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleJoin() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("community_members")
      .insert({ community_id: communityId, user_id: user.id });

    if (error) {
      toast.error("Failed to join group");
    } else {
      toast.success("Joined!");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Button size="sm" onClick={handleJoin} disabled={loading}>
      {loading ? "Joining..." : "Join"}
    </Button>
  );
}
