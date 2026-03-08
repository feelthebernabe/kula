import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Handshake,
  Star,
  MessageSquare,
  Clock,
  Building2,
  FileText,
  Send,
  UtensilsCrossed,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Platform Metrics" };

const ADMIN_EMAILS = [
  "michelleventures1@gmail.com",
  "michelle@kula.app",
];

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
}

function StatCard({ icon: Icon, label, value, subtext }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {subtext && (
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              {subtext}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check admin access
  const isAdmin = ADMIN_EMAILS.includes(user.email ?? "");
  if (!isAdmin) redirect("/feed");

  const admin = createAdminClient();

  // Run all queries in parallel
  const [
    usersResult,
    activeUsersResult,
    communitiesResult,
    postsResult,
    exchangesResult,
    reviewsResult,
    threadsResult,
    invitesResult,
    potlucksResult,
    ledgerResult,
    trustResult,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("onboarding_completed", true),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("onboarding_completed", true)
      .gte("last_active", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    admin.from("communities").select("*", { count: "exact", head: true }),
    admin
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("exchange_agreements")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    admin.from("reviews").select("rating"),
    admin
      .from("discussion_threads")
      .select("*", { count: "exact", head: true }),
    admin.from("invites").select("*", { count: "exact", head: true }),
    admin
      .from("potlucks")
      .select("*", { count: "exact", head: true })
      .eq("status", "upcoming"),
    admin
      .from("time_dollar_ledger")
      .select("amount")
      .eq("type", "exchange"),
    admin
      .from("profiles")
      .select("trust_score")
      .eq("onboarding_completed", true),
  ]);

  const totalUsers = usersResult.count ?? 0;
  const activeUsers = activeUsersResult.count ?? 0;
  const totalCommunities = communitiesResult.count ?? 0;
  const totalPosts = postsResult.count ?? 0;
  const completedExchanges = exchangesResult.count ?? 0;
  const totalThreads = threadsResult.count ?? 0;
  const totalInvites = invitesResult.count ?? 0;
  const upcomingPotlucks = potlucksResult.count ?? 0;

  const avgRating =
    reviewsResult.data && reviewsResult.data.length > 0
      ? (
          reviewsResult.data.reduce(
            (sum, r) => sum + (r.rating as number),
            0
          ) / reviewsResult.data.length
        ).toFixed(1)
      : "N/A";
  const totalReviews = reviewsResult.data?.length ?? 0;

  const tdInCirculation =
    ledgerResult.data
      ?.reduce((sum, e) => sum + Math.abs(e.amount as number), 0)
      .toFixed(0) ?? "0";

  const avgTrustScore =
    trustResult.data && trustResult.data.length > 0
      ? (
          trustResult.data.reduce(
            (sum, p) => sum + Number(p.trust_score ?? 0),
            0
          ) / trustResult.data.length
        ).toFixed(0)
      : "N/A";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Platform Metrics
        </h1>
        <p className="text-sm text-muted-foreground">
          Live data from Kula — updated in real time
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          icon={Users}
          label="Total Users"
          value={totalUsers}
          subtext={`${activeUsers} active in last 7 days`}
        />
        <StatCard
          icon={Handshake}
          label="Completed Exchanges"
          value={completedExchanges}
          subtext={`${totalReviews} reviews written`}
        />
        <StatCard
          icon={Star}
          label="Avg Review Rating"
          value={avgRating}
          subtext={`Across ${totalReviews} reviews`}
        />
        <StatCard
          icon={TrendingUp}
          label="Trust Score Avg"
          value={avgTrustScore}
          subtext="Across all active users"
        />
        <StatCard
          icon={Building2}
          label="Communities"
          value={totalCommunities}
        />
        <StatCard
          icon={FileText}
          label="Active Posts"
          value={totalPosts}
        />
        <StatCard
          icon={MessageSquare}
          label="Discussion Threads"
          value={totalThreads}
        />
        <StatCard
          icon={Clock}
          label="Time Dollars Exchanged"
          value={`${tdInCirculation} TD`}
          subtext="Total volume through the system"
        />
        <StatCard
          icon={Send}
          label="Invites Sent"
          value={totalInvites}
        />
        <StatCard
          icon={UtensilsCrossed}
          label="Upcoming Potlucks"
          value={upcomingPotlucks}
        />
      </div>
    </div>
  );
}
