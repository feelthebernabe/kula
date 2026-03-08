"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle, ArrowUpCircle } from "lucide-react";

interface PostStatusActionsProps {
  postId: string;
  currentStatus: string;
  updatedAt: string | null;
}

export function PostStatusActions({
  postId,
  currentStatus,
  updatedAt,
}: PostStatusActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Check if bump is allowed (once per 48 hours)
  const lastUpdate = updatedAt ? new Date(updatedAt).getTime() : 0;
  const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);
  const canBump = hoursSinceUpdate >= 48;

  async function updateStatus(status: "fulfilled" | "closed") {
    setLoading(true);
    const { error } = await supabase
      .from("posts")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", postId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(
        status === "fulfilled"
          ? "Post marked as fulfilled!"
          : "Post closed."
      );
      router.refresh();
    }
    setLoading(false);
  }

  async function bumpPost() {
    setLoading(true);
    const { error } = await supabase
      .from("posts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", postId);

    if (error) {
      toast.error("Failed to bump post");
    } else {
      toast.success("Post bumped! It'll show higher in the feed.");
      router.refresh();
    }
    setLoading(false);
  }

  if (currentStatus !== "active") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          This post is <span className="font-medium">{currentStatus}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateStatus("fulfilled")}
        disabled={loading}
      >
        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
        Mark Fulfilled
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => updateStatus("closed")}
        disabled={loading}
      >
        <XCircle className="mr-1.5 h-3.5 w-3.5" />
        Close Post
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={bumpPost}
        disabled={loading || !canBump}
        title={
          canBump
            ? "Refresh your post to show higher in the feed"
            : "You can bump once every 48 hours"
        }
      >
        <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5" />
        {canBump ? "Bump" : "Bumped recently"}
      </Button>
    </div>
  );
}
