"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import type { MapPost } from "@/types/database";

export function MapPostPopup({ post }: { post: MapPost }) {
  const initials =
    post.author_display_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <Link href={`/posts/${post.id}`} className="block space-y-2 no-underline">
      {/* Author row */}
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage src={post.author_avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium text-foreground truncate">
          {post.author_display_name}
        </span>
        <TrustScoreBadge score={post.author_trust_score} size="sm" />
      </div>

      {/* Type + Title */}
      <div>
        <Badge
          variant={post.type === "offer" ? "default" : "secondary"}
          className="text-[10px] mb-1"
        >
          {post.type === "offer" ? "Offering" : "Looking for"}
        </Badge>
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
          {post.title}
        </p>
      </div>

      {/* Body excerpt */}
      {post.body && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {post.body}
        </p>
      )}

      {/* Image thumbnail */}
      {post.images && post.images.length > 0 && (
        <div className="h-20 w-full overflow-hidden rounded-md bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.images[0]}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Exchange modes + time */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(post.exchange_modes ?? []).slice(0, 2).map((mode) => {
            const info = EXCHANGE_MODES.find((m) => m.value === mode);
            return (
              <Badge key={mode} variant="outline" className="text-[9px]">
                {info?.label || mode}
              </Badge>
            );
          })}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(post.created_at), {
            addSuffix: true,
          })}
        </span>
      </div>
    </Link>
  );
}
