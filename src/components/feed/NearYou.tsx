"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useGeolocation } from "@/lib/hooks/use-geolocation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { EXCHANGE_MODES } from "@/lib/constants/exchange-modes";
import { CATEGORIES } from "@/lib/constants/categories";
import { MapPin, Locate, Navigation } from "lucide-react";
import type { NearbyPost } from "@/types/database";

function formatDistance(miles: number): string {
  if (miles < 0.1) return "nearby";
  if (miles < 1) return `${Math.round(miles * 10) / 10} mi`;
  return `${Math.round(miles * 10) / 10} mi`;
}

export function NearYou() {
  const [offers, setOffers] = useState<NearbyPost[]>([]);
  const [needs, setNeeds] = useState<NearbyPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"offers" | "needs">("offers");
  const geo = useGeolocation();
  const supabase = createClient();

  // Fetch nearby posts once we have location
  useEffect(() => {
    if (!geo.latitude || !geo.longitude) return;

    async function fetchNearby() {
      setLoading(true);

      const [offersRes, needsRes] = await Promise.all([
        supabase.rpc("get_posts_nearby", {
          center_lat: geo.latitude!,
          center_lng: geo.longitude!,
          radius_miles: 3,
          filter_type: "offer",
          result_limit: 10,
        }),
        supabase.rpc("get_posts_nearby", {
          center_lat: geo.latitude!,
          center_lng: geo.longitude!,
          radius_miles: 3,
          filter_type: "request",
          result_limit: 10,
        }),
      ]);

      if (offersRes.data) {
        setOffers(offersRes.data as unknown as NearbyPost[]);
      }
      if (needsRes.data) {
        setNeeds(needsRes.data as unknown as NearbyPost[]);
      }
      setLoading(false);
      setLoaded(true);
    }

    fetchNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.latitude, geo.longitude]);

  // Not yet requested location - show prompt
  if (!geo.latitude && !geo.loading && !geo.error) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/50 p-6 text-center">
        <Navigation className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">
          What&apos;s near you?
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Share your location to see offers and needs in your neighborhood
        </p>
        <Button size="sm" onClick={geo.requestLocation}>
          <Locate className="mr-1.5 h-3.5 w-3.5" />
          Show what&apos;s nearby
        </Button>
      </div>
    );
  }

  // Loading geolocation
  if (geo.loading) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-6 text-center">
        <Locate className="mx-auto h-6 w-6 text-muted-foreground animate-pulse mb-2" />
        <p className="text-sm text-muted-foreground">Finding your location...</p>
      </div>
    );
  }

  // Geolocation denied
  if (geo.error) {
    return null;
  }

  // Loading posts
  if (loading && !loaded) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Near You</h2>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 w-64 shrink-0 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  // No nearby posts
  if (loaded && offers.length === 0 && needs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-muted/50 p-6 text-center">
        <MapPin className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No posts with locations near you yet.{" "}
          <Link href="/posts/new" className="text-primary hover:underline">
            Be the first!
          </Link>
        </p>
      </div>
    );
  }

  const activeList = tab === "offers" ? offers : needs;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Near You</h2>
          <span className="text-xs text-muted-foreground">Within 3 miles</span>
        </div>
        <Link href="/map">
          <Button variant="ghost" size="sm" className="text-xs">
            View map
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Badge
          variant={tab === "offers" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setTab("offers")}
        >
          Offers ({offers.length})
        </Badge>
        <Badge
          variant={tab === "needs" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setTab("needs")}
        >
          Needs ({needs.length})
        </Badge>
      </div>

      {/* Scrollable cards */}
      {activeList.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {activeList.map((post) => {
            const initials =
              post.author_display_name
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?";
            const category = CATEGORIES.find(
              (c) => c.value === post.category
            );

            return (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="shrink-0"
              >
                <Card className="w-64 transition-shadow hover:shadow-md">
                  <CardContent className="p-4 space-y-2.5">
                    {/* Author + distance */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7">
                          <AvatarImage
                            src={post.author_avatar_url || undefined}
                          />
                          <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground truncate">
                          {post.author_display_name}
                        </span>
                        <TrustScoreBadge
                          score={post.author_trust_score}
                          size="sm"
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatDistance(post.distance_miles)}
                      </span>
                    </div>

                    {/* Title */}
                    <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                      {post.title}
                    </p>

                    {/* Exchange modes */}
                    <div className="flex flex-wrap gap-1">
                      {(post.exchange_modes ?? []).slice(0, 2).map((mode) => {
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

                    {/* Location */}
                    {post.location_name && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {post.location_name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-2">
          No {tab === "offers" ? "offers" : "needs"} nearby.{" "}
          {tab === "offers" ? "Try switching to Needs." : "Try switching to Offers."}
        </p>
      )}
    </div>
  );
}
