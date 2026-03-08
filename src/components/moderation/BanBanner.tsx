"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BanBannerProps {
  communityId: string;
  userId: string;
}

export function BanBanner({ communityId, userId }: BanBannerProps) {
  const supabase = createClient();
  const [ban, setBan] = useState<{
    reason: string | null;
    expires_at: string | null;
  } | null>(null);

  useEffect(() => {
    async function checkBan() {
      const { data } = await supabase
        .from("community_bans")
        .select("reason, expires_at")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .maybeSingle();

      setBan(data);
    }

    checkBan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId, userId]);

  if (!ban) return null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 text-destructive">
        <Ban className="h-4 w-4 shrink-0" />
        <p className="text-sm font-medium">You are suspended from this community</p>
      </div>
      {ban.reason && (
        <p className="mt-1 text-xs text-muted-foreground pl-6">
          Reason: {ban.reason}
        </p>
      )}
      <p className="mt-1 text-xs text-muted-foreground pl-6">
        {ban.expires_at
          ? `Expires ${formatDistanceToNow(new Date(ban.expires_at), { addSuffix: true })}`
          : "This suspension is permanent"}
      </p>
    </div>
  );
}
