import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Gift, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { CATEGORIES } from "@/lib/constants/categories";
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

  const isOffer = post.type === "offer";

  return (
    <Link href={`/posts/${post.id}`}>
      <Card className={`overflow-hidden transition-shadow hover:shadow-md ${post.status !== "active" ? "opacity-60" : ""}`}>
        {/* Type accent strip */}
        <div className={`h-1 w-full ${isOffer ? "bg-primary" : "bg-amber-400"}`} />

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
              <span className="text-sm font-medium text-foreground truncate block">
                {post.author.display_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at!), {
                  addSuffix: true,
                })}
              </span>
            </div>
            {post.status !== "active" ? (
              <Badge variant="outline" className="shrink-0 text-muted-foreground">
                {post.status === "fulfilled" ? "Fulfilled" : "Closed"}
              </Badge>
            ) : (
              <div className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isOffer
                  ? "bg-primary/10 text-primary"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              }`}>
                {isOffer
                  ? <Gift className="h-3 w-3" />
                  : <Search className="h-3 w-3" />
                }
                {isOffer ? "Offering" : "Looking for"}
              </div>
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
            <div className="mt-3 overflow-hidden rounded-lg">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.images[0]}
                  alt={`${post.title} photo`}
                  className="h-full w-full object-cover"
                />
                {post.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                    +{post.images.length - 1}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {(post.exchange_modes ?? []).slice(0, 2).map((mode) => {
              const modeInfo = EXCHANGE_MODES.find((m) => m.value === mode);
              return (
                <Badge key={mode} variant="outline" className="text-xs">
                  {modeInfo?.label || mode}
                </Badge>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            {category && <span>{category.label}</span>}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
