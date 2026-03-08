import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TrustScoreBadge } from "@/components/profiles/TrustScoreBadge";
import { Settings, MapPin, Calendar, Camera, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { InviteList } from "@/components/invites/InviteList";
import { ReferencesList } from "@/components/profiles/ReferencesList";
import { TrustBreakdown } from "@/components/profiles/TrustBreakdown";
import { TrustBadges } from "@/components/profiles/TrustBadges";
import { computeTrustBadges } from "@/lib/utils/trust-badges";
import type { Profile, ReviewWithAuthor, InviteWithInvitee, ReferenceWithAuthor } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!rawProfile) redirect("/login");
  const profile = rawProfile as unknown as Profile;

  const { data: rawReviews } = await supabase
    .from("reviews")
    .select("*, author:profiles!author_id(id, display_name, avatar_url)")
    .eq("subject_id", user.id)
    .eq("revealed", true)
    .order("created_at", { ascending: false })
    .limit(5);

  const reviews = (rawReviews ?? []) as unknown as ReviewWithAuthor[];

  // Get time-dollar balance
  const { data: walletEntry } = await supabase
    .from("time_dollar_ledger")
    .select("balance_after")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const tdBalance = (walletEntry?.balance_after as number) ?? 0;

  // Get invite stats
  const { count: inviteCount } = await supabase
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", user.id)
    .not("used_by", "is", null);

  const { data: rawInvites } = await supabase
    .from("invites")
    .select("*, invitee:profiles!used_by(id, display_name, avatar_url)")
    .eq("inviter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const invites = (rawInvites ?? []) as unknown as InviteWithInvitee[];

  // Fetch references
  const { data: rawReferences } = await supabase
    .from("references")
    .select("*, author:profiles!references_author_id_fkey(id, display_name, avatar_url)")
    .eq("subject_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  const references = (rawReferences ?? []) as unknown as ReferenceWithAuthor[];

  // Review stats for trust breakdown (revealed only for display)
  const { data: rawReviewStats } = await supabase
    .from("reviews")
    .select("*")
    .eq("subject_id", user.id)
    .eq("revealed", true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewStats = (rawReviewStats ?? []) as any[];
  const ratings = reviewStats.map((r: { rating: number }) => r.rating);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  let ratingStddev: number | null = null;
  if (ratings.length >= 3 && avgRating !== null) {
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length;
    ratingStddev = Math.sqrt(variance);
  }

  // Compute dimension averages
  const dimReviews = (reviewStats ?? []).filter((r) => r.dim_reliability != null);
  const dimensionAverages = dimReviews.length > 0 ? {
    reliability: dimReviews.reduce((s, r) => s + (r.dim_reliability ?? 0), 0) / dimReviews.length,
    communication: dimReviews.reduce((s, r) => s + (r.dim_communication ?? 0), 0) / dimReviews.length,
    accuracy: dimReviews.reduce((s, r) => s + (r.dim_accuracy ?? 0), 0) / dimReviews.length,
    generosity: dimReviews.reduce((s, r) => s + (r.dim_generosity ?? 0), 0) / dimReviews.length,
    community: dimReviews.reduce((s, r) => s + (r.dim_community ?? 0), 0) / dimReviews.length,
  } : null;

  // Trust badge computation
  const { count: giftCount } = await supabase
    .from("exchange_agreements")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .eq("exchange_mode", "gift")
    .or(`provider_id.eq.${user.id},receiver_id.eq.${user.id}`);

  const { count: loanCount } = await supabase
    .from("exchange_agreements")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed")
    .eq("exchange_mode", "loan")
    .or(`provider_id.eq.${user.id},receiver_id.eq.${user.id}`);

  const { count: negReviewCount } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", user.id)
    .lte("rating", 2);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentPostCount } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id)
    .gte("created_at", thirtyDaysAgo);

  const trustBadges = computeTrustBadges({
    giftExchangesCompleted: giftCount ?? 0,
    loanExchangesCompleted: loanCount ?? 0,
    negativeReviewCount: negReviewCount ?? 0,
    recentActivity: (recentPostCount ?? 0) > 0,
    acceptedInvites: inviteCount ?? 0,
  });

  const initials = profile.display_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="space-y-6">
      {!profile.avatar_url && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-3">
            <Camera className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Add a profile photo</p>
              <p className="text-xs text-muted-foreground">People are more likely to share with profiles that have photos</p>
            </div>
            <Link href="/settings">
              <Button size="sm">Add Photo</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={profile.avatar_url || undefined}
                alt={profile.display_name}
              />
              <AvatarFallback className="bg-primary/10 text-lg text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">
                  {profile.display_name}
                </h1>
                <TrustScoreBadge score={profile.trust_score} showLabel />
                {profile.verified && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600" title="Verified member">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
              {trustBadges.length > 0 && (
                <div className="mt-1.5">
                  <TrustBadges badges={trustBadges} />
                </div>
              )}
              {profile.primary_location && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.primary_location}
                </p>
              )}
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Joined{" "}
                {formatDistanceToNow(new Date(profile.created_at!), {
                  addSuffix: true,
                })}
              </p>
              {(() => {
                const links = (profile.social_links as Record<string, string>) || {};
                const hasLinks = Object.values(links).some((v) => v?.trim());
                if (!hasLinks) return null;
                return (
                  <div className="mt-2 flex items-center gap-3">
                    {links.instagram && (
                      <a href={`https://instagram.com/${links.instagram}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Instagram">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      </a>
                    )}
                    {links.twitter && (
                      <a href={`https://x.com/${links.twitter}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="X / Twitter">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                    {links.linkedin && (
                      <a href={links.linkedin.startsWith("http") ? links.linkedin : `https://linkedin.com/in/${links.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="LinkedIn">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      </a>
                    )}
                    {links.website && (
                      <a href={links.website.startsWith("http") ? links.website : `https://${links.website}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Website">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
            <Link href="/settings">
              <Button variant="outline" size="icon" aria-label="Edit profile settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-muted-foreground">{profile.bio}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-6 text-sm">
            <div>
              <span className="font-semibold text-foreground">
                {profile.total_exchanges}
              </span>{" "}
              <span className="text-muted-foreground">exchanges</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {profile.total_given}
              </span>{" "}
              <span className="text-muted-foreground">given</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {profile.total_received}
              </span>{" "}
              <span className="text-muted-foreground">received</span>
            </div>
            <Link href="/wallet" className="flex items-center gap-1 text-primary hover:underline">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-semibold">{tdBalance.toFixed(1)}</span>{" "}
              <span>TD</span>
            </Link>
            {(inviteCount ?? 0) > 0 && (
              <div>
                <span className="font-semibold text-foreground">
                  {inviteCount}
                </span>{" "}
                <span className="text-muted-foreground">invited</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TrustBreakdown
        score={profile.trust_score}
        totalExchanges={profile.total_exchanges}
        totalGiven={profile.total_given}
        totalReceived={profile.total_received}
        verificationMethods={profile.verification_methods}
        verificationTier={profile.verification_tier}
        referenceCount={references.length}
        reviewCount={reviews.length}
        avgRating={avgRating}
        ratingStddev={ratingStddev}
        responseRate={profile.response_rate}
        lastActive={profile.last_active}
        dimensionAverages={dimensionAverages}
      />

      {(profile.skills?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(profile.skills ?? []).map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {((profile.offers_list?.length ?? 0) > 0 || (profile.needs_list?.length ?? 0) > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Offers & Needs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(profile.offers_list?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  Can Offer
                </p>
                <div className="flex flex-wrap gap-2">
                  {(profile.offers_list ?? []).map((offer) => (
                    <Badge key={offer} variant="outline" className="bg-primary/5">
                      {offer}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {(profile.needs_list?.length ?? 0) > 0 && (
              <>
                {(profile.offers_list?.length ?? 0) > 0 && <Separator />}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Looking For
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(profile.needs_list ?? []).map((need) => (
                      <Badge key={need} variant="outline">
                        {need}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews && reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {review.author?.display_name}
                    </span>
                    <span className="text-yellow-500 text-sm">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at!), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{review.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reviews yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            References{" "}
            {references.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({references.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReferencesList references={references} />
        </CardContent>
      </Card>

      <InviteList invites={invites} />
    </div>
  );
}
