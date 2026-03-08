"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { FlagContentButton } from "@/components/moderation/FlagContentButton";
import { ContentRemovedNotice } from "@/components/moderation/ContentRemovedNotice";
import type { PotluckCommentWithAuthor } from "@/types/database";

interface PotluckCommentSectionProps {
  potluckId: string;
  comments: PotluckCommentWithAuthor[];
  currentUserId: string | null;
  communityId?: string | null;
}

export function PotluckCommentSection({
  potluckId,
  comments,
  currentUserId,
  communityId,
}: PotluckCommentSectionProps) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!currentUserId) {
      toast.error("Please log in to comment");
      return;
    }

    if (body.trim().length < 1) {
      toast.error("Comment cannot be empty");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("potluck_comments").insert({
      potluck_id: potluckId,
      author_id: currentUserId,
      body: body.trim(),
    });

    if (error) {
      toast.error("Failed to post comment: " + error.message);
    } else {
      toast.success("Comment posted!");
      setBody("");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        Comments ({comments.length})
      </h3>

      {comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage
                  src={comment.author.avatar_url || undefined}
                />
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                  {comment.author.display_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {comment.author.display_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {comment.created_at &&
                      formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                  </span>
                  {communityId && (
                    <FlagContentButton
                      contentType="potluck_comment"
                      contentId={comment.id}
                      contentAuthorId={comment.author_id ?? comment.author.id}
                      communityId={communityId}
                      currentUserId={currentUserId}
                    />
                  )}
                </div>
                {comment.removed_by_mod ? (
                  <div className="mt-1">
                    <ContentRemovedNotice reason={comment.removed_reason} />
                  </div>
                ) : (
                  <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">
                    {comment.body}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No comments yet. Start the conversation!
        </p>
      )}

      {currentUserId && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Ask a question or leave a note..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={2000}
          />
          <Button type="submit" size="sm" disabled={loading || body.trim().length < 1}>
            {loading ? "Posting..." : "Post Comment"}
          </Button>
        </form>
      )}
    </div>
  );
}
