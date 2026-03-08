import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { UserRound, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { CATEGORIES } from "@/lib/constants/categories";
import type { PostWithAuthor } from "@/types/database";

export function PublicPostCard({ post }: { post: PostWithAuthor }) {
  const category = CATEGORIES.find((c) => c.value === post.category);

  return (
    <Link href="/signup">
      <Card className="transition-shadow hover:shadow-md cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            {/* Generic anonymous avatar */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <UserRound className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Community Member
                </span>
                <Lock className="h-3 w-3 text-muted-foreground/50" />
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at!), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <Badge
              variant={post.type === "offer" ? "default" : "secondary"}
              className="shrink-0"
            >
              {post.type === "offer" ? "Offering" : "Looking for"}
            </Badge>
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
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {category && <span>{category.label}</span>}
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
