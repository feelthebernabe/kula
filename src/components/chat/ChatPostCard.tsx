"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import type { ChatPost } from "@/types/chat";

export function ChatPostCard({ post }: { post: ChatPost }) {
  const initials =
    post.author_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  return (
    <Link href={`/posts/${post.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="space-y-2 py-3 px-3">
          {/* Author row */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.author_avatar || undefined} />
              <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-foreground truncate">
              {post.author_name}
            </span>
            {post.author_trust_score != null && (
              <TrustScoreBadge score={post.author_trust_score} size="sm" />
            )}
          </div>

          {/* Title + type */}
          <div className="flex items-start gap-2">
            <p className="text-sm font-medium text-foreground flex-1 line-clamp-1">
              {post.title}
            </p>
            <Badge
              variant={post.type === "offer" ? "default" : "secondary"}
              className="shrink-0 text-[10px]"
            >
              {post.type}
            </Badge>
          </div>

          {/* Body snippet */}
          {post.body && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {post.body}
            </p>
          )}

          {/* Exchange modes */}
          {(post.exchange_modes?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {(post.exchange_modes ?? []).map((mode) => {
                const info = EXCHANGE_MODES.find((m) => m.value === mode);
                return (
                  <Badge
                    key={mode}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {info?.label || mode}
                  </Badge>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
