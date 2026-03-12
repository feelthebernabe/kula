import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Users, MessageSquare, Pin } from "lucide-react";
import { ThreadReplyForm } from "@/components/community/ThreadReplyForm";
import { FlagContentButton } from "@/components/moderation/FlagContentButton";
import { ContentRemovedNotice } from "@/components/moderation/ContentRemovedNotice";
import { PinThreadButton } from "@/components/moderation/PinThreadButton";

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: thread } = await supabase
    .from("discussion_threads")
    .select(
      "*, author:profiles!author_id(id, display_name, avatar_url), community:communities!community_id(id, name)"
    )
    .eq("id", threadId)
    .is("removed_by_mod", null)
    .single();

  if (!thread) notFound();

  const community = (thread as unknown as { community: { id: string; name: string } | null })
    .community;

  // Check if current user is moderator/admin
  let isMod = false;
  if (user && community) {
    const { data: memberData } = await supabase
      .from("community_members")
      .select("role")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();
    isMod = memberData?.role === "moderator" || memberData?.role === "admin";
  }

  const { data: replies } = await supabase
    .from("discussion_replies")
    .select("*, author:profiles!author_id(id, display_name, avatar_url)")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Back navigation + community context */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Link
          href="/discuss"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Discussions
        </Link>
        {community && (
          <>
            <span>&middot;</span>
            <Link
              href={`/groups/${community.id}`}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              {community.name}
            </Link>
          </>
        )}
      </div>

      {/* Thread */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {thread.pinned && <Pin className="h-4 w-4 text-primary shrink-0" />}
            <h1 className="text-lg font-bold text-foreground flex-1">{thread.title}</h1>
            {isMod && community && user && (
              <PinThreadButton
                threadId={threadId}
                communityId={community.id}
                isPinned={!!thread.pinned}
                currentUserId={user.id}
              />
            )}
            {community && (
              <FlagContentButton
                contentType="thread"
                contentId={threadId}
                contentAuthorId={thread.author_id}
                communityId={community.id}
                currentUserId={user?.id ?? null}
              />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link
              href={`/profile/${thread.author?.id}`}
              className="flex items-center gap-2 hover:text-foreground transition-colors"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={thread.author?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                  {thread.author?.display_name?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">
                {thread.author?.display_name}
              </span>
            </Link>
            <span>&middot;</span>
            <span>
              {formatDistanceToNow(new Date(thread.created_at!), {
                addSuffix: true,
              })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {thread.removed_by_mod ? (
            <ContentRemovedNotice reason={thread.removed_reason} />
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {thread.body}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Replies */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MessageSquare className="h-4 w-4" />
          {thread.reply_count} {thread.reply_count === 1 ? "reply" : "replies"}
        </div>

        {replies && replies.length > 0 ? (
          replies.map((reply) => (
            <Card key={reply.id}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link
                    href={`/profile/${reply.author?.id}`}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={reply.author?.avatar_url || undefined}
                      />
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                        {reply.author?.display_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">
                      {reply.author?.display_name}
                    </span>
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(reply.created_at!), {
                      addSuffix: true,
                    })}
                  </span>
                  {community && (
                    <FlagContentButton
                      contentType="reply"
                      contentId={reply.id}
                      contentAuthorId={reply.author_id}
                      communityId={community.id}
                      currentUserId={user?.id ?? null}
                    />
                  )}
                </div>
                {reply.removed_by_mod ? (
                  <ContentRemovedNotice reason={reply.removed_reason} />
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {reply.body}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No replies yet. Be the first to respond!
          </p>
        )}
      </div>

      <Separator />

      {/* Reply form */}
      {user && <ThreadReplyForm threadId={threadId} />}
    </div>
  );
}
