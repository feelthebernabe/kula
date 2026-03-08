import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { CATEGORIES } from "@/lib/constants/categories";
import { CONDITIONS } from "@/lib/constants/conditions";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { QuickAskButton } from "./QuickAskButton";
import { PostCardBookmark } from "./PostCardBookmark";
import type { PostWithAuthor } from "@/types/database";

export function PostCard({ post }: { post: PostWithAuthor }) {
  if (post.removed_by_mod) return null;

  const category = CATEGORIES.find((c) => c.value === post.category);
  const initials = post.author.display_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <Link href={`/posts/${post.id}`}>
      <Card className={`transition-shadow hover:shadow-md ${post.status !== "active" ? "opacity-60" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={post.author.avatar_url || undefined}
                alt={post.author.display_name}
              />
              <AvatarFallback className="bg-primary/10 text-sm text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {post.author.display_name}
                </span>
                <TrustScoreBadge score={post.author.trust_score} size="sm" />
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at!), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <PostCardBookmark postId={post.id} />
            {post.status !== "active" ? (
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                {post.status === "fulfilled" ? "Fulfilled" : "Closed"}
              </Badge>
            ) : (
              <Badge
                variant={post.type === "offer" ? "default" : "secondary"}
                className="shrink-0"
              >
                {post.type === "offer" ? "Offering" : "Looking for"}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          <h3 className="text-base font-semibold text-foreground leading-tight">
            {post.title}
          </h3>
          {post.body && (
            <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
              {post.body}
            </p>
          )}

          {post.images && post.images.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-hidden rounded-lg">
              {post.images.slice(0, 2).map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-video flex-1 overflow-hidden rounded-lg bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`${post.title} photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
              {post.images.length > 2 && (
                <div className="flex aspect-video flex-1 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                  +{post.images.length - 2} more
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {(post.exchange_modes ?? []).map((mode) => {
              const modeInfo = EXCHANGE_MODES.find((m) => m.value === mode);
              return (
                <Badge key={mode} variant="outline" className="text-xs">
                  {modeInfo?.label || mode}
                </Badge>
              );
            })}
            {post.status === "active" && (
              <QuickAskButton postId={post.id} authorId={post.author_id} />
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {category && <span>{category.label}</span>}
            {post.condition && (
              <span>
                {CONDITIONS.find((c) => c.value === post.condition)?.label ??
                  post.condition}
              </span>
            )}
            {(post.response_count ?? 0) > 0 && (
              <span>
                {post.response_count}{" "}
                {post.response_count === 1 ? "response" : "responses"}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
