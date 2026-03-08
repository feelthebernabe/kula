import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { RespondButton } from "@/components/posts/RespondButton";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { CATEGORIES } from "@/lib/constants/categories";
import { CONDITIONS } from "@/lib/constants/conditions";
import { FlagContentButton } from "@/components/moderation/FlagContentButton";
import { ContentRemovedNotice } from "@/components/moderation/ContentRemovedNotice";
import { Button } from "@/components/ui/button";
import { PostStatusActions } from "@/components/posts/PostStatusActions";
import { Pencil } from "lucide-react";
import Link from "next/link";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:profiles!author_id(id, display_name, avatar_url, trust_score, bio, primary_location, skills),
      community:communities!community_id(id, name)
    `
    )
    .eq("id", postId)
    .single();

  if (!post) {
    notFound();
  }

  const category = CATEGORIES.find((c) => c.value === post.category);
  const isAuthor = user?.id === post.author_id;

  const initials = post.author?.display_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author?.id}`}>
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={post.author?.avatar_url || undefined}
                  alt={post.author?.display_name}
                />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/profile/${post.author?.id}`}
                  className="text-sm font-medium text-foreground hover:underline"
                >
                  {post.author?.display_name}
                </Link>
                <TrustScoreBadge
                  score={post.author?.trust_score || 30}
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {formatDistanceToNow(new Date(post.created_at!), {
                    addSuffix: true,
                  })}
                </span>
                {post.community && (
                  <>
                    <span>&middot;</span>
                    <span>{post.community.name}</span>
                  </>
                )}
              </div>
            </div>
            {isAuthor && (
              <Link href={`/posts/${post.id}/edit`}>
                <Button variant="ghost" size="sm">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            {post.community_id && (
              <FlagContentButton
                contentType="post"
                contentId={post.id}
                contentAuthorId={post.author_id}
                communityId={post.community_id}
                currentUserId={user?.id ?? null}
              />
            )}
            <Badge variant={post.type === "offer" ? "default" : "secondary"}>
              {post.type === "offer" ? "Offering" : "Looking for"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{post.title}</h1>
            {post.removed_by_mod ? (
              <div className="mt-2">
                <ContentRemovedNotice reason={post.removed_reason} />
              </div>
            ) : post.body ? (
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                {post.body}
              </p>
            ) : null}
          </div>

          {!post.removed_by_mod && (
            <>
              {post.images && post.images.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {post.images.map((img: string, i: number) => (
                    <div
                      key={i}
                      className="relative aspect-video overflow-hidden rounded-lg bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`${post.title} photo ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Category
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {category?.label || post.category}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Exchange Mode
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(post.exchange_modes ?? []).map((mode: string) => {
                      const modeInfo = EXCHANGE_MODES.find(
                        (m) => m.value === mode
                      );
                      return (
                        <Badge key={mode} variant="outline">
                          {modeInfo?.label || mode}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {post.condition && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Condition
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {CONDITIONS.find((c) => c.value === post.condition)?.label || post.condition}
                    </p>
                  </div>
                )}

                {post.loan_duration && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Loan Duration
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {post.loan_duration}
                    </p>
                  </div>
                )}

                {post.time_dollar_amount && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Time-Dollar Amount
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {post.time_dollar_amount} TD
                    </p>
                  </div>
                )}
              </div>

              {!isAuthor && post.status === "active" && (
                <>
                  <Separator />
                  <RespondButton postId={post.id} authorId={post.author_id} />
                </>
              )}
            </>
          )}

          {isAuthor && (
            <>
              <Separator />
              <PostStatusActions
                postId={post.id}
                currentStatus={post.status ?? "active"}
                updatedAt={post.updated_at}
              />
            </>
          )}

          {!isAuthor && post.status !== "active" && (
            <>
              <Separator />
              <p className="text-center text-sm text-muted-foreground">
                This post has been{" "}
                <span className="font-medium">{post.status}</span>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
