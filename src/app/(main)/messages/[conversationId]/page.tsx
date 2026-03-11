import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { MessageThread } from "@/components/messages/MessageThread";
import { ProposeExchangeForm } from "@/components/exchanges/ProposeExchangeForm";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: conversation } = await supabase
    .from("conversations")
    .select(
      `
      *,
      participant_a_profile:profiles!participant_a(id, display_name, avatar_url),
      participant_b_profile:profiles!participant_b(id, display_name, avatar_url),
      post:posts!post_id(id, title, type, author_id, exchange_modes, status)
    `
    )
    .eq("id", conversationId)
    .single();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  // Check if an exchange already exists for this post between these users
  let existingExchange = null;
  if (conversation.post_id) {
    const { data } = await supabase
      .from("exchange_agreements")
      .select("id, status")
      .eq("post_id", conversation.post_id)
      .or(
        `and(provider_id.eq.${user.id},receiver_id.eq.${conversation.participant_a === user.id ? conversation.participant_b : conversation.participant_a}),and(provider_id.eq.${conversation.participant_a === user.id ? conversation.participant_b : conversation.participant_a},receiver_id.eq.${user.id})`
      )
      .limit(1)
      .single();
    existingExchange = data;
  }

  const otherUser =
    conversation.participant_a === user.id
      ? conversation.participant_b_profile
      : conversation.participant_a_profile;

  const otherUserId =
    conversation.participant_a === user.id
      ? conversation.participant_b
      : conversation.participant_a;

  const initials =
    otherUser?.display_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  const post = conversation.post;
  const canPropose =
    post &&
    post.status === "active" &&
    !existingExchange;

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-2xl flex-col pb-safe">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link
          href="/messages"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Back to messages"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar className="h-9 w-9">
          <AvatarImage
            src={otherUser?.avatar_url || undefined}
            alt={otherUser?.display_name || "User"}
          />
          <AvatarFallback className="bg-primary/10 text-xs text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {otherUser?.display_name}
          </p>
          {post && (
            <Link
              href={`/posts/${post.id}`}
              className="text-xs text-muted-foreground hover:underline"
            >
              Re: {post.title}
            </Link>
          )}
        </div>
      </div>

      {/* Post context card + exchange status */}
      {post && (
        <div className="mt-4 space-y-3">
          <Link href={`/posts/${post.id}`}>
            <Card className="mx-auto w-fit max-w-sm bg-accent/50 px-4 py-2">
              <p className="text-xs text-muted-foreground">
                {post.type === "offer" ? "Offering" : "Looking for"}:{" "}
                <span className="font-medium text-foreground">
                  {post.title}
                </span>
              </p>
            </Card>
          </Link>

          {existingExchange && (
            <Link href={`/exchanges/${existingExchange.id}`}>
              <div className="mx-auto w-fit">
                <Badge variant="outline" className="gap-1 capitalize">
                  Exchange: {(existingExchange.status ?? "proposed").replace("_", " ")}
                </Badge>
              </div>
            </Link>
          )}

          {canPropose && (
            <div className="px-4">
              <ProposeExchangeForm
                postId={post.id}
                postTitle={post.title}
                postAuthorId={post.author_id}
                postType={post.type as "offer" | "request"}
                postExchangeModes={post.exchange_modes}
                currentUserId={user.id}
                conversationId={conversationId}
              />
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <MessageThread
        conversationId={conversationId}
        currentUserId={user.id}
        initialMessages={messages || []}
      />
    </div>
  );
}
