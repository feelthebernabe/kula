"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { Sparkles } from "lucide-react";

interface MatchedPost {
  id: string;
  title: string;
  type: "offer" | "request";
  exchange_modes: string[];
  author_display_name: string;
  author_avatar_url: string | null;
  author_trust_score: number | null;
  match_reason: string;
}

export function MatchesForYou({ userId }: { userId: string }) {
  const [matches, setMatches] = useState<MatchedPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadMatches() {
      const { data, error } = await supabase.rpc("get_matching_posts", {
        p_user_id: userId,
        result_limit: 6,
      });

      if (!error && data && data.length > 0) {
        setMatches(data as MatchedPost[]);
      }
      setLoaded(true);
    }
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!loaded || matches.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Matches for You
        </h2>
        <span className="text-xs text-muted-foreground">
          Based on your profile
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {matches.map((match) => {
          const initials = match.author_display_name
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2) || "?";

          return (
            <Link
              key={match.id}
              href={`/posts/${match.id}`}
              className="shrink-0"
            >
              <Card className="w-64 transition-shadow hover:shadow-md">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={match.author_avatar_url || undefined}
                        alt={match.author_display_name}
                      />
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground truncate">
                      {match.author_display_name}
                    </span>
                    <TrustScoreBadge
                      score={match.author_trust_score}
                      size="sm"
                    />
                  </div>

                  <div>
                    <Badge
                      variant={
                        match.type === "offer" ? "default" : "secondary"
                      }
                      className="text-[10px] mb-1.5"
                    >
                      {match.type === "offer" ? "Offering" : "Looking for"}
                    </Badge>
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                      {match.title}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(match.exchange_modes ?? []).slice(0, 2).map((mode) => {
                      const modeInfo = EXCHANGE_MODES.find(
                        (m) => m.value === mode
                      );
                      return (
                        <Badge
                          key={mode}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {modeInfo?.label || mode}
                        </Badge>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-primary/80 italic">
                    {match.match_reason}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
