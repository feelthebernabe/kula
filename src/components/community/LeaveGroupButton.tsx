"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function LeaveGroupButton({
  communityId,
  communityName,
}: {
  communityId: string;
  communityName: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLeave() {
    if (!confirm(`Leave ${communityName}? You can rejoin anytime.`)) return;
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
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to leave group");
    } else {
      toast.success("Left group");
      router.push("/groups");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLeave} disabled={loading}>
      {loading ? "Leaving..." : "Leave"}
    </Button>
  );
}
