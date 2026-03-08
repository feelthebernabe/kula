import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Star, Handshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Exchanges" };

const STATUS_COLORS: Record<string, string> = {
  proposed: "bg-primary/10 text-primary",
  accepted: "bg-amber-500/10 text-amber-600",
  in_progress: "bg-violet-500/10 text-violet-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  disputed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

export default async function ExchangesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: exchanges } = await supabase
    .from("exchange_agreements")
    .select(
      `
      *,
      post:posts!post_id(id, title, type),
      provider:profiles!provider_id(id, display_name),
      receiver:profiles!receiver_id(id, display_name)
    `
    )
    .or(`provider_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  // Fetch reviews by this user to determine which completed exchanges need reviews
  const { data: myReviews } = await supabase
    .from("reviews")
    .select("exchange_id")
    .eq("author_id", user.id);

  const reviewedExchangeIds = new Set(
    (myReviews ?? []).map((r) => r.exchange_id)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Exchanges</h1>
        <p className="text-sm text-muted-foreground">
          Track your sharing activity
        </p>
      </div>

      {exchanges && exchanges.length > 0 ? (
        <div className="space-y-3">
          {exchanges.map((exchange) => {
            const isProvider = exchange.provider_id === user.id;
            const otherParty = isProvider
              ? exchange.receiver
              : exchange.provider;
            const modeInfo = EXCHANGE_MODES.find(
              (m) => m.value === exchange.exchange_mode
            );

            return (
              <Link key={exchange.id} href={`/exchanges/${exchange.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {exchange.post?.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isProvider ? "Giving to" : "Receiving from"}{" "}
                        {otherParty?.display_name} &middot;{" "}
                        {modeInfo?.label || exchange.exchange_mode}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(exchange.created_at!), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        className={
                          STATUS_COLORS[exchange.status ?? "proposed"] || "bg-muted"
                        }
                      >
                        {(exchange.status ?? "proposed").replace("_", " ")}
                      </Badge>
                      {exchange.status === "completed" &&
                        !reviewedExchangeIds.has(exchange.id) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            Leave a review
                          </span>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Handshake}
          heading="Your first exchange is waiting"
          description="Browse the feed to find offers and requests from your neighbors, then start sharing!"
          actionLabel="Browse the feed"
          actionHref="/feed"
        />
      )}
    </div>
  );
}
